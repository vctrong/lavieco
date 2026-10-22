"use server";

import { randomBytes } from "node:crypto";

import { identityClient } from "@/lib/services";
import { clientIp, requestId } from "@/lib/request-meta";
import { setMemberSession } from "@/lib/session";

import { MEMBER_CONSENT_VERSION } from "../constants/config";
import { signupCompleteSchema, signupDetailsSchema } from "../schemas";
import { checkBot } from "../server/anti-bot";
import { guarded, toAuthError, toFieldErrors } from "../server/outcomes";
import type { AuthResult, CodeSent } from "../types";

/**
 * Step 1 of sign-up: validates the details and emails a 6-digit code (`purpose: signup`).
 * The response never says whether the address already has an account (BR-06, no enumeration).
 */
export async function requestSignupCode(input: unknown): Promise<AuthResult<CodeSent>> {
  const id = await requestId();
  return guarded("signup.start", id, async () => {
    const parsed = signupDetailsSchema.safeParse(input);
    if (!parsed.success) return toFieldErrors(parsed.error);
    const bot = await checkBot(input);
    if (bot === "challenge_failed") return { status: "error", reason: "bot" } as const;
    if (bot === "honeypot") {
      return {
        status: "ok",
        challengeId: randomBytes(16).toString("base64url"),
        resendAvailableAt: new Date(Date.now() + 45_000).toISOString(),
      } as const;
    }

    try {
      const sent = await identityClient().createOtpChallenge(
        { email: parsed.data.email, purpose: "signup", clientIp: await clientIp() },
        id,
      );
      return {
        status: "ok",
        challengeId: sent.challengeId,
        resendAvailableAt: sent.resendAvailableAt,
      } as const;
    } catch (error) {
      return toAuthError(error, "signup.request_code", id);
    }
  });
}

/**
 * Step 2: checks the code, creates the account and signs in. If the code was right
 * but the password is refused, the proof is handed back so only the password changes.
 */
export async function completeSignup(input: unknown): Promise<AuthResult> {
  const id = await requestId();
  return guarded("signup.complete", id, async () => {
    const parsed = signupCompleteSchema.safeParse(input);
    if (!parsed.success) return toFieldErrors(parsed.error);
    const { challengeId, code, displayName, email, password } = parsed.data;
    const identity = identityClient();

    let verificationToken = parsed.data.verificationToken;
    if (!verificationToken) {
      try {
        verificationToken = (await identity.verifyOtpChallenge({ challengeId, code }, id))
          .verificationToken;
      } catch (error) {
        return toAuthError(error, "signup.verify_code", id);
      }
    }

    try {
      const tokens = await identity.registerMember(
        { displayName, email, password, verificationToken, consentVersion: MEMBER_CONSENT_VERSION },
        id,
      );
      await setMemberSession(tokens);
      return { status: "ok" } as const;
    } catch (error) {
      const failure = toAuthError(error, "signup.register", id);
      return failure.status === "error" && failure.reason === "password_weak"
        ? { ...failure, verificationToken }
        : failure;
    }
  });
}
