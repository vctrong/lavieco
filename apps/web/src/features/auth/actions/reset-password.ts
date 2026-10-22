"use server";

import { randomBytes } from "node:crypto";

import { identityClient } from "@/lib/services";
import { clientIp, requestId } from "@/lib/request-meta";
import { setMemberSession } from "@/lib/session";

import { resetCompleteSchema, resetRequestSchema } from "../schemas";
import { checkBot } from "../server/anti-bot";
import { guarded, toAuthError, toFieldErrors } from "../server/outcomes";
import type { AuthResult, CodeSent } from "../types";

/** Step 1: asks for a reset code. Same answer whether or not the email has an account. */
export async function requestResetCode(input: unknown): Promise<AuthResult<CodeSent>> {
  const id = await requestId();
  return guarded("reset.start", id, async () => {
    const parsed = resetRequestSchema.safeParse(input);
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
        { email: parsed.data.email, purpose: "reset_password", clientIp: await clientIp() },
        id,
      );
      return {
        status: "ok",
        challengeId: sent.challengeId,
        resendAvailableAt: sent.resendAvailableAt,
      } as const;
    } catch (error) {
      return toAuthError(error, "reset.request_code", id);
    }
  });
}

/** Step 2: code + new password; every old session is revoked, then the member is signed in. */
export async function completeReset(input: unknown): Promise<AuthResult> {
  const id = await requestId();
  return guarded("reset.complete", id, async () => {
    const parsed = resetCompleteSchema.safeParse(input);
    if (!parsed.success) return toFieldErrors(parsed.error);
    const { challengeId, code, email, newPassword } = parsed.data;
    const identity = identityClient();

    let verificationToken = parsed.data.verificationToken;
    if (!verificationToken) {
      try {
        verificationToken = (await identity.verifyOtpChallenge({ challengeId, code }, id))
          .verificationToken;
      } catch (error) {
        return toAuthError(error, "reset.verify_code", id);
      }
    }

    try {
      await identity.resetMemberPassword({ verificationToken, newPassword }, id);
    } catch (error) {
      const failure = toAuthError(error, "reset.apply", id);
      return failure.status === "error" && failure.reason === "password_weak"
        ? { ...failure, verificationToken }
        : failure;
    }

    try {
      await setMemberSession(await identity.memberLogin({ email, password: newPassword }, id));
    } catch {
      // The password IS changed; signing in again by hand still works.
    }
    return { status: "ok" } as const;
  });
}
