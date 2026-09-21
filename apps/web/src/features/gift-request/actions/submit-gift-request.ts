"use server";

import type { LeadSubmitOutcome } from "@/shared/hooks/use-lead-form";

import { giftRequestSchema } from "../schemas";

/**
 * Receives the individual gift request (UC-04).
 *
 * TODO(lead-service): forward to lead-service (lead + gift_request in one
 * transaction with an outbox row, docs/03 §6.3) with the Idempotency-Key.
 * lead-service does not exist yet, so this validates and reports
 * `unavailable`; it must never pretend the request was stored (BR-04).
 */
export async function submitGiftRequest(input: unknown): Promise<LeadSubmitOutcome> {
  const parsed = giftRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  return { status: "unavailable" };
}
