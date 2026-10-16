import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { problemDetailsSchema } from "@lavieco/shared";
import { memberProfileSchema, tokenPairSchema } from "@lavieco/shared/identity";

import { createTestApp, drainOutbox, type TestApp } from "../support/test-app";
import { GOOGLE_IDENTITY } from "../../modules/auth/application/ports/google-identity.port";
import { OTP_SERVICE, type OtpService } from "../../modules/otp";

const PASSWORD = "vo so tay do 2026";

let t: TestApp;
const google = {
  enabled: true,
  identity: {
    sub: "g-1",
    email: "google.member@example.test",
    emailVerified: true,
    name: "Khách Google",
  },
  async exchange() {
    return this.identity;
  },
};

beforeAll(async () => {
  t = await createTestApp(inject("mongoUri"), (builder) => {
    builder.overrideProvider(GOOGLE_IDENTITY).useValue(google);
  });
});

afterAll(async () => {
  await t?.close();
});

async function web() {
  return `Bearer ${await t.serviceToken("web")}`;
}

/** OTP challenge → code from the captured email → verification proof. */
async function verifyEmail(email: string, purpose: "signup" | "reset_password") {
  const created = await t
    .http()
    .post("/internal/v1/otp-challenges")
    .set("authorization", await web())
    .send({ email, purpose, clientIp: "203.0.113.7" })
    .expect(201);
  const verified = await t
    .http()
    .post("/internal/v1/otp-challenges/verify")
    .set("authorization", await web())
    .send({ challengeId: created.body.challengeId, code: t.emails.codeFor(email) })
    .expect(200);
  return verified.body.verificationToken as string;
}

async function register(email: string) {
  const verificationToken = await verifyEmail(email, "signup");
  const res = await t
    .http()
    .post("/internal/v1/members")
    .set("authorization", await web())
    .send({
      displayName: "Khách Mời",
      email,
      password: PASSWORD,
      verificationToken,
      consentVersion: "member-2026-10",
    })
    .expect(201);
  return tokenPairSchema.parse(res.body);
}

describe("member sign-up → OTP → login (Phase 1 'done when')", () => {
  it("creates the account after the email OTP and signs in", async () => {
    const tokens = await register("khach.moi@example.test");

    const me = await t
      .http()
      .get("/internal/v1/members/me")
      .set("authorization", `Bearer ${tokens.accessToken}`)
      .expect(200);
    const profile = memberProfileSchema.parse(me.body);
    expect(profile).toMatchObject({ email: "khach.moi@example.test", hasPassword: true });
    expect(profile.emailVerifiedAt).not.toBeNull();

    const login = await t
      .http()
      .post("/internal/v1/member-sessions")
      .set("authorization", await web())
      .send({ email: "KHACH.MOI@example.test", password: PASSWORD })
      .expect(200);
    tokenPairSchema.parse(login.body);
  });

  it("stores the consent version and time (BR-06)", async () => {
    const user = await t.db
      .collection("users")
      .findOne({ emailNormalized: "khach.moi@example.test" });
    expect(user?.consent).toMatchObject({ version: "member-2026-10" });
    expect(user?.consent.at).toBeInstanceOf(Date);
  });

  it("refuses a verification proof twice (single use)", async () => {
    const email = "mot.lan@example.test";
    const verificationToken = await verifyEmail(email, "signup");
    const body = {
      displayName: "A",
      email,
      password: PASSWORD,
      verificationToken,
      consentVersion: "v1",
    };
    await t
      .http()
      .post("/internal/v1/members")
      .set("authorization", await web())
      .send(body)
      .expect(201);
    const again = await t
      .http()
      .post("/internal/v1/members")
      .set("authorization", await web())
      .send(body)
      .expect(400);
    expect(again.body.code).toBe("otp.verification_invalid");
  });

  it("sends an 'account exists' notice instead of a code for a known email", async () => {
    // Past the resend cooldown of the sign-up done above.
    const later = new Date(Date.now() + 60_000);
    await t.app
      .get<OtpService>(OTP_SERVICE)
      .create({ email: "khach.moi@example.test", purpose: "signup" }, later);
    const last = t.emails.lastTo("khach.moi@example.test");
    expect(last?.subject).toContain("đã có tài khoản");
    expect(last?.text).not.toMatch(/\b\d{6}\b/);
  });

  it("answers a wrong password with a generic error", async () => {
    const res = await t
      .http()
      .post("/internal/v1/member-sessions")
      .set("authorization", await web())
      .send({ email: "khach.moi@example.test", password: "sai mat khau 123" })
      .expect(401);
    expect(problemDetailsSchema.parse(res.body).code).toBe("auth.invalid_credentials");
  });
});

describe("OTP limits (docs/05 §7)", () => {
  it("locks a challenge after 5 wrong codes", async () => {
    const email = "nhap.sai@example.test";
    const created = await t
      .http()
      .post("/internal/v1/otp-challenges")
      .set("authorization", await web())
      .send({ email, purpose: "signup" })
      .expect(201);
    const right = t.emails.codeFor(email);
    const wrong = right === "000000" ? "111111" : "000000";
    const codes: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const res = await t
        .http()
        .post("/internal/v1/otp-challenges/verify")
        .set("authorization", await web())
        .send({ challengeId: created.body.challengeId, code: wrong });
      codes.push(res.body.code);
    }
    expect(codes.slice(0, 4)).toEqual(Array(4).fill("otp.code_invalid"));
    expect(codes[4]).toBe("otp.attempts_exceeded");
    // Even the right code no longer works.
    const res = await t
      .http()
      .post("/internal/v1/otp-challenges/verify")
      .set("authorization", await web())
      .send({ challengeId: created.body.challengeId, code: right })
      .expect(429);
    expect(res.body.code).toBe("otp.attempts_exceeded");
  });

  it("refuses an immediate resend (cooldown) with Retry-After", async () => {
    const email = "gui.lai@example.test";
    const send = async () =>
      t
        .http()
        .post("/internal/v1/otp-challenges")
        .set("authorization", await web())
        .send({ email, purpose: "signup" });
    expect((await send()).status).toBe(201);
    const second = await send();
    expect(second.status).toBe(429);
    expect(second.body.code).toBe("otp.send_limited");
    expect(Number(second.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("allows at most 3 sends per email per 10 minutes", async () => {
    const otp = t.app.get<OtpService>(OTP_SERVICE);
    const start = Date.parse("2030-01-01T00:00:00Z");
    const at = (seconds: number) => new Date(start + seconds * 1000);
    const email = "ba.lan@example.test";
    for (const seconds of [0, 50, 100]) {
      await otp.create({ email, purpose: "signup" }, at(seconds));
    }
    await expect(otp.create({ email, purpose: "signup" }, at(150))).rejects.toMatchObject({
      code: "otp.send_limited",
    });
    await expect(otp.create({ email, purpose: "signup" }, at(601))).resolves.toBeDefined();
  });
});

describe("sessions (refresh rotation, reuse detection)", () => {
  it("rotates once; reusing the old token revokes the whole family", async () => {
    const first = await register("phien@example.test");
    const auth = await web();
    const refresh = (token: string) =>
      t
        .http()
        .post("/internal/v1/sessions/refresh")
        .set("authorization", auth)
        .send({ refreshToken: token });

    const rotated = await (await refresh(first.refreshToken)).body;
    expect(tokenPairSchema.parse(rotated).refreshToken).not.toBe(first.refreshToken);

    const reuse = await refresh(first.refreshToken);
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe("auth.session_invalid");
    // The legitimately rotated token is now dead too: the family was revoked.
    expect((await refresh(rotated.refreshToken)).status).toBe(401);
  });

  it("does not let the admin BFF refresh a member session", async () => {
    const tokens = await register("bff@example.test");
    const res = await t
      .http()
      .post("/internal/v1/sessions/refresh")
      .set("authorization", `Bearer ${await t.serviceToken("admin")}`)
      .send({ refreshToken: tokens.refreshToken })
      .expect(401);
    expect(res.body.code).toBe("auth.session_invalid");
  });
});

describe("password reset", () => {
  it("resets after an OTP, revokes sessions and emails a notice via the outbox", async () => {
    const email = "quen.mat.khau@example.test";
    const before = await register(email);
    const verificationToken = await verifyEmail(email, "reset_password");
    await t
      .http()
      .post("/internal/v1/member-passwords/reset")
      .set("authorization", await web())
      .send({ verificationToken, newPassword: "mat khau moi 2026" })
      .expect(204);

    const refresh = await t
      .http()
      .post("/internal/v1/sessions/refresh")
      .set("authorization", await web())
      .send({ refreshToken: before.refreshToken });
    expect(refresh.status).toBe(401);

    expect(await drainOutbox(t)).toBe(1);
    expect(t.emails.lastTo(email)?.subject).toContain("vừa được đổi");
    const job = await t.db.collection("outbox").findOne({ type: "member.password_changed" });
    expect(Object.keys(job?.payload ?? {})).toEqual(["userId"]);

    await t
      .http()
      .post("/internal/v1/member-sessions")
      .set("authorization", await web())
      .send({ email, password: "mat khau moi 2026" })
      .expect(200);
  });

  it("sends no code for an address without a member account", async () => {
    const count = t.emails.sent.length;
    await t
      .http()
      .post("/internal/v1/otp-challenges")
      .set("authorization", await web())
      .send({ email: "khong.ton.tai@example.test", purpose: "reset_password" })
      .expect(201);
    expect(t.emails.sent.length).toBe(count);
  });
});

describe("Google sign-in (members only)", () => {
  it("requires consent to create a new account, then signs in", async () => {
    const body = {
      code: "c",
      codeVerifier: "v".repeat(43),
      redirectUri: "http://web.test/api/auth/google/callback",
    };
    const refused = await t
      .http()
      .post("/internal/v1/member-sessions/google")
      .set("authorization", await web())
      .send(body);
    expect(refused.status).toBe(422);
    expect(refused.body.code).toBe("member.consent_required");

    await t
      .http()
      .post("/internal/v1/member-sessions/google")
      .set("authorization", await web())
      .send({ ...body, consentVersion: "member-2026-10" })
      .expect(200);
    // Second time: linked by Google subject, no consent needed.
    await t
      .http()
      .post("/internal/v1/member-sessions/google")
      .set("authorization", await web())
      .send(body)
      .expect(200);
  });
});

describe("access rules and privacy", () => {
  it("refuses web-only endpoints to the admin BFF and tokens aimed at another service", async () => {
    const body = { email: "x@example.test", purpose: "signup" };
    await t
      .http()
      .post("/internal/v1/otp-challenges")
      .set("authorization", `Bearer ${await t.serviceToken("admin")}`)
      .send(body)
      .expect(403);
    await t
      .http()
      .post("/internal/v1/otp-challenges")
      .set("authorization", `Bearer ${await t.serviceToken("web", "lead-service")}`)
      .send(body)
      .expect(401);
  });

  it("never accepts a member token on staff endpoints", async () => {
    const tokens = await register("member.staff@example.test");
    await t
      .http()
      .get("/internal/v1/staff/me")
      .set("authorization", `Bearer ${tokens.accessToken}`)
      .expect(401);
  });

  it("publishes a JWKS without private key material", async () => {
    const res = await t.http().get("/.well-known/jwks.json").expect(200);
    expect(res.body.keys).toHaveLength(1);
    expect(res.body.keys[0]).not.toHaveProperty("d");
  });

  it("wrote no email address, code or password into the logs", () => {
    const logs = t.logs.join("");
    expect(logs).not.toContain("@example.test");
    expect(logs).not.toContain(PASSWORD);
  });
});
