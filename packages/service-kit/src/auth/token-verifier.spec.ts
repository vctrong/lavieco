import { SignJWT, generateKeyPair } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { IDENTITY_ISSUER, TOKEN_AUDIENCES } from "@lavieco/shared/identity";

import type { StaffPrincipal } from "./principal";
import { TokenVerifier } from "./token-verifier";

let verifier: TokenVerifier;
let sign: (claims: Record<string, unknown>, audience: string, subject: string) => Promise<string>;

const staff: StaffPrincipal = {
  kind: "staff",
  userId: "u1",
  sessionId: "s1",
  roles: ["coordinator"],
  permissions: [],
};

beforeAll(async () => {
  const identity = await generateKeyPair("EdDSA", { crv: "Ed25519" });
  verifier = new TokenVerifier({
    serviceName: "program-service",
    userKeys: { resolver: async () => identity.publicKey },
    trustedServiceKeys: {},
  });
  sign = (claims, audience, subject) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "EdDSA" })
      .setIssuer(IDENTITY_ISSUER)
      .setAudience(audience)
      .setSubject(subject)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(identity.privateKey);
});

describe("verifyEmailProof", () => {
  it("accepts a proof for the expected purpose", async () => {
    const token = await sign(
      { email: "a@example.com", purpose: "checkout" },
      TOKEN_AUDIENCES.emailVerification,
      "verification-id-1",
    );
    await expect(verifier.verifyEmailProof(token, "checkout")).resolves.toMatchObject({
      sub: "verification-id-1",
      email: "a@example.com",
    });
  });

  it("refuses another purpose, another audience and garbage", async () => {
    const lookup = await sign(
      { email: "a@example.com", purpose: "ticket_lookup" },
      TOKEN_AUDIENCES.emailVerification,
      "verification-id-2",
    );
    const access = await sign({ typ: "member", sid: "s" }, TOKEN_AUDIENCES.member, "u1");
    for (const token of [lookup, access, "not-a-token"]) {
      await expect(verifier.verifyEmailProof(token, "checkout")).rejects.toMatchObject({
        code: "otp.verification_invalid",
      });
    }
  });
});

describe("verifyStepUp", () => {
  it("accepts the same user and session", async () => {
    const token = await sign({ sid: "s1" }, TOKEN_AUDIENCES.stepUp, "u1");
    await expect(verifier.verifyStepUp(token, staff)).resolves.toBeUndefined();
  });

  it("refuses a missing token, another session or user, and an access token", async () => {
    const otherSession = await sign({ sid: "s2" }, TOKEN_AUDIENCES.stepUp, "u1");
    const otherUser = await sign({ sid: "s1" }, TOKEN_AUDIENCES.stepUp, "u2");
    const access = await sign({ typ: "staff", sid: "s1", roles: [] }, TOKEN_AUDIENCES.staff, "u1");
    for (const token of [undefined, otherSession, otherUser, access]) {
      await expect(verifier.verifyStepUp(token, staff)).rejects.toMatchObject({
        code: "auth.step_up_required",
      });
    }
  });
});
