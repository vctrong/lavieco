"use server";

import { randomBytes } from "node:crypto";

import { z } from "zod";

import type { TicketLookupResponse } from "@lavieco/shared/events";

import { clientIp, requestId } from "@/lib/request-meta";
import { identityClient, programClient } from "@/lib/services";

import { TEXT } from "../constants/text";
import { buyerSchema, challengeIdSchema, otpCodeSchema } from "../schemas";
import { checkBot } from "../server/anti-bot";
import { guarded, toCheckoutError, toFieldErrors } from "../server/outcomes";
import type { CheckoutResult, CodeSent } from "../types";

const lookupStartSchema = z.object({
  email: buyerSchema.shape.email,
  website: z.string().max(200).optional(),
  turnstileToken: z.string().max(4096).optional(),
});

/** `/tra-cuu-ve` step 1: a 6-digit code to the email (`purpose: ticket_lookup`). */
export async function requestLookupCode(input: unknown): Promise<CheckoutResult<CodeSent>> {
  const id = await requestId();
  return guarded("lookup.start", id, async () => {
    const parsed = lookupStartSchema.safeParse(input);
    if (!parsed.success) return toFieldErrors(parsed.error);
    const bot = await checkBot(parsed.data);
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
        { email: parsed.data.email, purpose: "ticket_lookup", clientIp: await clientIp() },
        id,
      );
      return {
        status: "ok",
        challengeId: sent.challengeId,
        resendAvailableAt: sent.resendAvailableAt,
      } as const;
    } catch (error) {
      return toCheckoutError(error, "lookup.request_code", id);
    }
  });
}

/** Step 2: the code, then every paid order of that email, each with its ticket link. */
export async function verifyLookup(input: {
  challengeId: unknown;
  code: unknown;
}): Promise<CheckoutResult<TicketLookupResponse>> {
  const challengeId = challengeIdSchema.safeParse(input.challengeId);
  const code = otpCodeSchema.safeParse(input.code);
  if (!challengeId.success || !code.success) {
    return { status: "invalid", fieldErrors: { code: TEXT.vi.errors.codeFormat } };
  }
  const id = await requestId();
  try {
    const proof = await identityClient().verifyOtpChallenge(
      { challengeId: challengeId.data, code: code.data },
      id,
    );
    const found = await programClient().lookupTickets(proof.verificationToken, id);
    return { status: "ok", items: found.items };
  } catch (error) {
    return toCheckoutError(error, "lookup.verify", id);
  }
}
