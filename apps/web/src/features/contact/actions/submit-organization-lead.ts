"use server";

import type { LeadSubmitOutcome } from "@/shared/hooks/use-lead-form";

import { organizationLeadSchema } from "../schemas";

/**
 * Receives the organization lead form (UC-05/06).
 *
 * TODO(lead-service): forward to POST /internal/v1/leads through
 * @lavieco/api-clients with a short-lived service token and the
 * Idempotency-Key. lead-service does not exist yet, so this validates and
 * reports `unavailable`; it must never pretend the lead was stored (BR-04).
 */
export async function submitOrganizationLead(input: unknown): Promise<LeadSubmitOutcome> {
  const parsed = organizationLeadSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  return { status: "unavailable" };
}
