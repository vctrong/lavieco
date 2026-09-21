"use server";

import type { LeadSubmitOutcome } from "@/shared/hooks/use-lead-form";

import { waitlistSchema } from "../schemas";

/**
 * Receives a waitlist sign-up (UC-07).
 *
 * TODO(lead-service): forward `{ email, consent: { version: WAITLIST_CONSENT_VERSION, at } }`
 * plus the Idempotency-Key to lead-service `waitlist` (docs/03 §6.3) through
 * `@lavieco/api-clients`. Neither the service nor its client exists yet, so this
 * validates and reports `unavailable`: it must never pretend the address was stored (BR-04).
 * TODO(DQ3): decide whether a double opt-in email is required.
 */
export async function submitWaitlist(input: unknown): Promise<LeadSubmitOutcome> {
  const parsed = waitlistSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  return { status: "unavailable" };
}
