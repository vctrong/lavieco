import { randomUUID } from "node:crypto";

import { decodeJwt } from "jose";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import {
  TOKEN_AUDIENCES,
  emailVerificationClaimsSchema,
  stepUpClaimsSchema,
  tokenPairSchema,
} from "@lavieco/shared/identity";

import { INVITATION_SERVICE, type InvitationService } from "../../modules/invitations";
import { OTP_SERVICE, type OtpService } from "../../modules/otp";
import { base32Decode } from "../../modules/security/domain/base32";
import { hotp, timeStep } from "../../modules/security/domain/totp";
import { createTestApp, type TestApp } from "../support/test-app";

const PASSWORD = "xuong thuc hanh 04";

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp(inject("mongoUri"));
});

afterAll(async () => {
  await t?.close();
});

const bearer = async (caller: "web" | "admin" | "program-service") =>
  `Bearer ${await t.serviceToken(caller)}`;
const codeAt = (secret: string, stepOffset: number) =>
  hotp(base32Decode(secret), timeStep(new Date()) + stepOffset);

/** A coordinator signed in with password + TOTP; returns the session and TOTP secret. */
async function signedInStaff(email: string) {
  const invitations = t.app.get<InvitationService>(INVITATION_SERVICE);
  const { token } = await invitations.create({
    email,
    displayName: "Tạm",
    roles: ["coordinator"],
    invitedBy: "test",
  });
  const inspected = await t
    .http()
    .post("/internal/v1/invitations/inspect")
    .set("authorization", await bearer("admin"))
    .send({ token })
    .expect(200);
  const secret = inspected.body.totp.secret as string;
  await t
    .http()
    .post("/internal/v1/invitations/accept")
    .set("authorization", await bearer("admin"))
    .send({ token, displayName: "Điều phối", password: PASSWORD, totpCode: codeAt(secret, 0) })
    .expect(200);
  const step1 = await t
    .http()
    .post("/internal/v1/staff-sessions")
    .set("authorization", await bearer("admin"))
    .send({ email, password: PASSWORD })
    .expect(200);
  const step2 = await t
    .http()
    .post("/internal/v1/staff-sessions/mfa")
    .set("authorization", await bearer("admin"))
    .send({ mfaToken: step1.body.mfaToken, code: codeAt(secret, 1) })
    .expect(200);
  return { tokens: tokenPairSchema.parse(step2.body), secret };
}

describe("step-up (ADR-0021)", () => {
  it("issues a 5-minute token bound to the user and session after a fresh TOTP", async () => {
    const { tokens, secret } = await signedInStaff("buoc.them@lavieco.test");
    const access = decodeJwt(tokens.accessToken);

    const wrong = await t
      .http()
      .post("/internal/v1/staff/step-up")
      .set("authorization", `Bearer ${tokens.accessToken}`)
      .send({ code: "000000" })
      .expect(401);
    expect(wrong.body.code).toBe("auth.mfa_code_invalid");

    // Sign-in used the next time step already; pretend 30 s went by instead of waiting.
    await t.db
      .collection("users")
      .updateOne(
        { emailNormalized: "buoc.them@lavieco.test" },
        { $set: { "mfa.totp.lastUsedStep": timeStep(new Date()) - 2 } },
      );
    const res = await t
      .http()
      .post("/internal/v1/staff/step-up")
      .set("authorization", `Bearer ${tokens.accessToken}`)
      .send({ code: codeAt(secret, 0) })
      .expect(200);
    const claims = stepUpClaimsSchema.parse(decodeJwt(res.body.stepUpToken));
    expect(claims.aud).toBe(TOKEN_AUDIENCES.stepUp);
    expect(claims.sub).toBe(access.sub);
    expect(claims.sid).toBe(access.sid);
    expect(Date.parse(res.body.expiresAt) - Date.now()).toBeLessThanOrEqual(5 * 60 * 1000);

    const audit = await t.db.collection("audit_events").find({ action: "staff.step_up" }).toArray();
    expect(audit.map((event) => event.result).sort()).toEqual(["failure", "success"]);
  });

  it("refuses a recovery code and a service token", async () => {
    const { tokens } = await signedInStaff("khong.khoi.phuc@lavieco.test");
    await t
      .http()
      .post("/internal/v1/staff/step-up")
      .set("authorization", `Bearer ${tokens.accessToken}`)
      .send({ code: "abcde-12345" })
      .expect(400);
    await t
      .http()
      .post("/internal/v1/staff/step-up")
      .set("authorization", await bearer("admin"))
      .send({ code: "123456" })
      .expect(401);
  });
});

describe("audit events from other services", () => {
  const event = (eventId: string, userId: string) => ({
    eventId,
    at: new Date().toISOString(),
    action: "registration.export",
    actor: { userId, roles: ["coordinator"] },
    target: { type: "event", id: "6650a1b2c3d4e5f6a7b8c9d0" },
    result: "success",
    requestId: "req-1",
    meta: { rows: 12 },
  });

  it("records once per eventId and fills the actor's email", async () => {
    const { tokens } = await signedInStaff("xuat.excel@lavieco.test");
    const userId = String(decodeJwt(tokens.accessToken).sub);
    const eventId = randomUUID();
    for (let i = 0; i < 2; i += 1) {
      await t
        .http()
        .post("/internal/v1/audit-events")
        .set("authorization", await bearer("program-service"))
        .send(event(eventId, userId))
        .expect(204);
    }
    const stored = await t.db
      .collection("audit_events")
      .find({ action: "registration.export" })
      .toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      service: "program-service",
      actor: { userId, email: "xuat.excel@lavieco.test" },
      meta: { rows: 12 },
    });
  });

  it("refuses callers other than program-service", async () => {
    await t
      .http()
      .post("/internal/v1/audit-events")
      .set("authorization", await bearer("web"))
      .send(event(randomUUID(), "u1"))
      .expect(403);
  });
});

describe("email proofs for the checkout", () => {
  it("gives a signed-in member a proof of their verified email, in the OTP format", async () => {
    const email = "thanh.vien@example.test";
    const created = await t
      .http()
      .post("/internal/v1/otp-challenges")
      .set("authorization", await bearer("web"))
      .send({ email, purpose: "signup" })
      .expect(201);
    const verified = await t
      .http()
      .post("/internal/v1/otp-challenges/verify")
      .set("authorization", await bearer("web"))
      .send({ challengeId: created.body.challengeId, code: t.emails.codeFor(email) })
      .expect(200);
    const registered = await t
      .http()
      .post("/internal/v1/members")
      .set("authorization", await bearer("web"))
      .send({
        displayName: "Thành viên",
        email,
        password: PASSWORD,
        verificationToken: verified.body.verificationToken,
        consentVersion: "member-2026-10",
      })
      .expect(201);
    const tokens = tokenPairSchema.parse(registered.body);

    const res = await t
      .http()
      .post("/internal/v1/members/me/email-proofs")
      .set("authorization", `Bearer ${tokens.accessToken}`)
      .send({ purpose: "checkout" })
      .expect(201);
    const claims = emailVerificationClaimsSchema.parse(decodeJwt(res.body.verificationToken));
    expect(claims).toMatchObject({
      email,
      purpose: "checkout",
      uid: decodeJwt(tokens.accessToken).sub,
    });

    // Only the checkout purpose, and never through a service token.
    await t
      .http()
      .post("/internal/v1/members/me/email-proofs")
      .set("authorization", `Bearer ${tokens.accessToken}`)
      .send({ purpose: "signup" })
      .expect(400);
    await t
      .http()
      .post("/internal/v1/members/me/email-proofs")
      .set("authorization", await bearer("web"))
      .send({ purpose: "checkout" })
      .expect(401);
  });

  it("refuses a member whose email was never verified", async () => {
    const { insertedId } = await t.db.collection("users").insertOne({
      schemaVersion: 1,
      type: "member",
      email: "chua.xac.thuc@example.test",
      emailNormalized: "chua.xac.thuc@example.test",
      displayName: "Chưa xác thực",
      roles: [],
      status: "active",
      emailVerifiedAt: null,
      revision: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const otp = t.app.get<OtpService>(OTP_SERVICE);
    await expect(otp.issueMemberProof(insertedId.toHexString(), "checkout")).rejects.toMatchObject({
      code: "otp.verification_invalid",
    });
  });

  it("locks a checkout OTP after 5 wrong codes, even for the right code afterwards", async () => {
    const email = "khach.sai.ma@example.test";
    const created = await t
      .http()
      .post("/internal/v1/otp-challenges")
      .set("authorization", await bearer("web"))
      .send({ email, purpose: "checkout" })
      .expect(201);
    const right = t.emails.codeFor(email);
    const wrong = right === "000000" ? "111111" : "000000";
    const codes: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const res = await t
        .http()
        .post("/internal/v1/otp-challenges/verify")
        .set("authorization", await bearer("web"))
        .send({ challengeId: created.body.challengeId, code: wrong });
      codes.push(res.body.code as string);
    }
    expect(codes.slice(0, 4)).toEqual(Array(4).fill("otp.code_invalid"));
    expect(codes[4]).toBe("otp.attempts_exceeded");
    const after = await t
      .http()
      .post("/internal/v1/otp-challenges/verify")
      .set("authorization", await bearer("web"))
      .send({ challengeId: created.body.challengeId, code: right });
    expect(after.body.code).toBe("otp.attempts_exceeded");
  });
});
