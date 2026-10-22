"use server";

import { randomBytes } from "node:crypto";

import type { OrderView } from "@lavieco/shared/events";

import { clientIp, requestId } from "@/lib/request-meta";
import { identityClient, programClient } from "@/lib/services";

import { CHECKOUT_CONSENT_VERSION, CHECKOUT_ROUTES } from "../constants/config";
import {
  challengeIdSchema,
  checkoutDraftSchema,
  otpCodeSchema,
  type CheckoutDraft,
} from "../schemas";
import { checkBot } from "../server/anti-bot";
import { memberProofFor } from "../server/orders";
import { guarded, toCheckoutError, toFieldErrors } from "../server/outcomes";
import type { CheckoutResult, CodeSent, OrderPlaced } from "../types";

/** Free orders are paid at once: straight to the tickets; paid ones to the QR page. */
function destination(accessToken: string, order: OrderView): string {
  return order.status === "paid"
    ? `${CHECKOUT_ROUTES.ticket(accessToken)}?moi=1`
    : CHECKOUT_ROUTES.payment(accessToken);
}

async function placeOrder(
  draft: CheckoutDraft,
  verificationToken: string,
  context: string,
  id: string,
) {
  try {
    const created = await programClient().createOrder(
      {
        eventSlug: draft.eventSlug,
        items: draft.items,
        buyer: draft.buyer,
        answers: draft.answers,
        note: draft.note,
        dataConsent: true,
        consentVersion: CHECKOUT_CONSENT_VERSION,
        safetyAcknowledged: draft.safetyAcknowledged,
        isGuardian: draft.isGuardian,
        verificationToken,
      },
      id,
    );
    return {
      status: "ok" as const,
      redirectTo: destination(created.accessToken, created.order),
    };
  } catch (error) {
    return toCheckoutError(error, context, id);
  }
}

/**
 * Step 1: checks the form, then either books right away (signed-in member booking with
 * their own verified email) or emails a 6-digit code (`purpose: checkout`, BR-12).
 * Seats are only held once the email is verified (BR-14).
 */
export async function startCheckout(
  input: unknown,
): Promise<CheckoutResult<(CodeSent & { kind: "code" }) | (OrderPlaced & { kind: "placed" })>> {
  // One id for every call of this step, so the reference shown points at all its logs.
  const id = await requestId();
  return guarded("checkout.start", id, async () => {
    const parsed = checkoutDraftSchema.safeParse(input);
    if (!parsed.success) return toFieldErrors(parsed.error);
    const bot = await checkBot(parsed.data);
    if (bot === "challenge_failed") return { status: "error", reason: "bot" } as const;
    if (bot === "honeypot") {
      return {
        status: "ok",
        kind: "code",
        challengeId: randomBytes(16).toString("base64url"),
        resendAvailableAt: new Date(Date.now() + 45_000).toISOString(),
      } as const;
    }

    const memberProof = await memberProofFor(parsed.data.buyer.email, id);
    if (memberProof) {
      const placed = await placeOrder(parsed.data, memberProof, "checkout.member_order", id);
      return placed.status === "ok" ? { ...placed, kind: "placed" as const } : placed;
    }

    try {
      const sent = await identityClient().createOtpChallenge(
        { email: parsed.data.buyer.email, purpose: "checkout", clientIp: await clientIp() },
        id,
      );
      return {
        status: "ok",
        kind: "code",
        challengeId: sent.challengeId,
        resendAvailableAt: sent.resendAvailableAt,
      } as const;
    } catch (error) {
      return toCheckoutError(error, "checkout.request_code", id);
    }
  });
}

/** Step 2: checks the code, then holds the seats and creates the order. */
export async function confirmCheckout(input: {
  draft: unknown;
  challengeId: unknown;
  code: unknown;
}): Promise<CheckoutResult<OrderPlaced>> {
  const id = await requestId();
  return guarded("checkout.confirm", id, async () => {
    const draft = checkoutDraftSchema.safeParse(input.draft);
    if (!draft.success) return toFieldErrors(draft.error);
    const challengeId = challengeIdSchema.safeParse(input.challengeId);
    const code = otpCodeSchema.safeParse(input.code);
    if (!challengeId.success || !code.success) {
      return { status: "error", reason: "code_invalid" } as const;
    }

    let verificationToken: string;
    try {
      verificationToken = (
        await identityClient().verifyOtpChallenge(
          { challengeId: challengeId.data, code: code.data },
          id,
        )
      ).verificationToken;
    } catch (error) {
      return toCheckoutError(error, "checkout.verify_code", id);
    }
    return placeOrder(draft.data, verificationToken, "checkout.order", id);
  });
}
