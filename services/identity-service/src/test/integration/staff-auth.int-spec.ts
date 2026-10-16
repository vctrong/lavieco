import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { staffProfileSchema, tokenPairSchema } from "@lavieco/shared/identity";

import { INVITATION_SERVICE, type InvitationService } from "../../modules/invitations";
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

const admin = async () => `Bearer ${await t.serviceToken("admin")}`;
const codeAt = (secret: string, stepOffset: number) =>
  hotp(base32Decode(secret), timeStep(new Date()) + stepOffset);

/** Invites a staff member and completes the set-up; returns the TOTP secret. */
async function onboard(email: string, roles: ("super_admin" | "coordinator")[]) {
  const invitations = t.app.get<InvitationService>(INVITATION_SERVICE);
  const { token } = await invitations.create({
    email,
    displayName: "Tạm",
    roles,
    invitedBy: "test",
  });

  const inspected = await t
    .http()
    .post("/internal/v1/invitations/inspect")
    .set("authorization", await admin())
    .send({ token })
    .expect(200);
  const secret = inspected.body.totp.secret as string;
  expect(inspected.body.totp.otpauthUri).toContain("otpauth://totp/");

  const accepted = await t
    .http()
    .post("/internal/v1/invitations/accept")
    .set("authorization", await admin())
    .send({ token, displayName: "Điều phối viên", password: PASSWORD, totpCode: codeAt(secret, 0) })
    .expect(200);
  expect(accepted.body.recoveryCodes).toHaveLength(10);
  return { secret, recoveryCodes: accepted.body.recoveryCodes as string[], token };
}

async function passwordStep(email: string, password = PASSWORD) {
  return t
    .http()
    .post("/internal/v1/staff-sessions")
    .set("authorization", await admin())
    .send({ email, password });
}

async function secondStep(mfaToken: string, code: string) {
  return t
    .http()
    .post("/internal/v1/staff-sessions/mfa")
    .set("authorization", await admin())
    .send({ mfaToken, code });
}

describe("staff on-boarding and two-step login", () => {
  it("activates only after password + TOTP; the link works once", async () => {
    const { token } = await onboard("dieu.phoi@lavieco.test", ["coordinator"]);
    const again = await t
      .http()
      .post("/internal/v1/invitations/inspect")
      .set("authorization", await admin())
      .send({ token })
      .expect(400);
    expect(again.body.code).toBe("invitation.invalid");
  });

  it("refuses a staff login without a second factor, then opens a session", async () => {
    const { secret } = await onboard("hai.lop@lavieco.test", ["coordinator"]);
    const step1 = await passwordStep("hai.lop@lavieco.test");
    expect(step1.status).toBe(200);
    expect(step1.body).not.toHaveProperty("accessToken");

    // The code used during set-up (current step) cannot be replayed.
    expect((await secondStep(step1.body.mfaToken, codeAt(secret, 0))).body.code).toBe(
      "auth.mfa_code_invalid",
    );
    const step2 = await secondStep(step1.body.mfaToken, codeAt(secret, 1));
    expect(step2.status).toBe(200);
    const tokens = tokenPairSchema.parse(step2.body);

    const me = await t
      .http()
      .get("/internal/v1/staff/me")
      .set("authorization", `Bearer ${tokens.accessToken}`)
      .expect(200);
    const profile = staffProfileSchema.parse(me.body);
    expect(profile.roles).toEqual(["coordinator"]);
    expect(profile.permissions).toContain("checkin:perform");
    expect(profile.permissions).not.toContain("user:manage");

    const audit = await t.db
      .collection("audit_events")
      .find({ action: "staff.login", result: "success" })
      .toArray();
    expect(audit.length).toBeGreaterThan(0);
  });

  it("accepts a recovery code once", async () => {
    const { recoveryCodes } = await onboard("khoi.phuc@lavieco.test", ["super_admin"]);
    const code = recoveryCodes[0]!;
    const first = await passwordStep("khoi.phuc@lavieco.test");
    expect((await secondStep(first.body.mfaToken, code)).status).toBe(200);
    const second = await passwordStep("khoi.phuc@lavieco.test");
    expect((await secondStep(second.body.mfaToken, code)).status).toBe(401);
  });

  it("locks the account after 5 wrong passwords", async () => {
    await onboard("bi.khoa@lavieco.test", ["coordinator"]);
    const statuses: number[] = [];
    for (let i = 0; i < 5; i += 1)
      statuses.push((await passwordStep("bi.khoa@lavieco.test", "sai mat khau")).status);
    expect(statuses).toEqual([401, 401, 401, 401, 401]);
    const locked = await passwordStep("bi.khoa@lavieco.test");
    expect(locked.status).toBe(423);
    expect(locked.body.code).toBe("auth.account_locked");
  });

  it("does not let a member sign in to admin", async () => {
    await t.db.collection("users").insertOne({
      schemaVersion: 1,
      type: "member",
      email: "member@lavieco.test",
      emailNormalized: "member@lavieco.test",
      displayName: "Member",
      roles: [],
      status: "active",
      passwordHash: null,
      revision: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const res = await passwordStep("member@lavieco.test");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("auth.invalid_credentials");
  });

  it("refuses the staff endpoints to the web BFF", async () => {
    await t
      .http()
      .post("/internal/v1/staff-sessions")
      .set("authorization", `Bearer ${await t.serviceToken("web")}`)
      .send({ email: "a@lavieco.test", password: "x" })
      .expect(403);
  });

  it("stores the TOTP secret encrypted and only hashes of recovery codes", async () => {
    const user = await t.db
      .collection("users")
      .findOne({ emailNormalized: "dieu.phoi@lavieco.test" });
    expect(user?.mfa.totp.secretEnc).toMatch(/^v1\./);
    expect(user?.passwordHash).toMatch(/^\$argon2id\$/);
    for (const code of user?.mfa.recoveryCodes ?? []) {
      expect(code.hash).not.toMatch(/^[a-z0-9]{5}-[a-z0-9]{5}$/);
    }
  });
});
