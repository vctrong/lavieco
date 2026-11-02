"use server";

import type { z } from "zod";

import { objectIdSchema } from "@lavieco/shared";
import {
  surveyCreateRequestSchema,
  surveyStatusRequestSchema,
  surveyUpdateRequestSchema,
  type SurveyView,
} from "@lavieco/shared/events";

import { programClient } from "@/lib/services";

import { TEXT } from "../constants/text";
import { callSurveys } from "../server/surveys";
import type { SurveyActionResult } from "../types";

function fieldErrors(error: z.ZodError): SurveyActionResult<never> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    errors[issue.path.join(".")] ??= TEXT.vi.errors.invalid;
  }
  return { status: "invalid", fieldErrors: errors };
}

export async function createSurvey(input: unknown): Promise<SurveyActionResult<SurveyView>> {
  const parsed = surveyCreateRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callSurveys("surveys.create", (token, id) =>
    programClient().createSurvey(token, parsed.data, id),
  );
}

export async function updateSurvey(
  surveyId: unknown,
  input: unknown,
): Promise<SurveyActionResult<SurveyView>> {
  const id = objectIdSchema.safeParse(surveyId);
  if (!id.success) return { status: "error", reason: "not_found" };
  const parsed = surveyUpdateRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callSurveys("surveys.update", (token, requestId) =>
    programClient().updateSurvey(token, id.data, parsed.data, requestId),
  );
}

export async function setSurveyStatus(
  surveyId: unknown,
  input: unknown,
): Promise<SurveyActionResult<SurveyView>> {
  const id = objectIdSchema.safeParse(surveyId);
  if (!id.success) return { status: "error", reason: "not_found" };
  const parsed = surveyStatusRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callSurveys("surveys.status", (token, requestId) =>
    programClient().setSurveyStatus(token, id.data, parsed.data, requestId),
  );
}

export async function duplicateSurvey(surveyId: unknown): Promise<SurveyActionResult<SurveyView>> {
  const id = objectIdSchema.safeParse(surveyId);
  if (!id.success) return { status: "error", reason: "not_found" };
  return callSurveys("surveys.duplicate", (token, requestId) =>
    programClient().duplicateSurvey(token, id.data, requestId),
  );
}
