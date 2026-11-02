"use server";

import { z } from "zod";

import { isServiceProblem } from "@lavieco/api-clients";
import { surveySubmitRequestSchema } from "@lavieco/shared/events";

import { clientIp, requestId } from "@/lib/request-meta";
import { programClient } from "@/lib/services";

export type SurveySubmitFailure =
  "invalid" | "closed" | "already" | "link" | "rate_limited" | "unavailable";

export type SurveySubmitResult =
  { status: "ok" } | { status: "error"; reason: SurveySubmitFailure };

const inputSchema = surveySubmitRequestSchema.omit({ clientIp: true }).extend({
  slug: z.string().min(3).max(80),
  /** Honeypot: humans leave it empty. */
  website: z.string().max(200).optional(),
});

const FAILURE_BY_CODE: Record<string, SurveySubmitFailure> = {
  "survey.answers_invalid": "invalid",
  "survey.consent_required": "invalid",
  "common.validation_failed": "invalid",
  "survey.closed": "closed",
  "common.not_found": "closed",
  "survey.already_answered": "already",
  "survey.link_invalid": "link",
  "common.rate_limited": "rate_limited",
};

/** Validates on the server too; a filled honeypot gets a success and stores nothing. */
export async function submitSurvey(input: unknown): Promise<SurveySubmitResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const { slug, website, ...body } = parsed.data;
  if (website) return { status: "ok" };
  try {
    await programClient().submitSurvey(
      slug,
      { ...body, clientIp: await clientIp() },
      await requestId(),
    );
    return { status: "ok" };
  } catch (error) {
    const reason = isServiceProblem(error) ? FAILURE_BY_CODE[error.code] : undefined;
    return { status: "error", reason: reason ?? "unavailable" };
  }
}
