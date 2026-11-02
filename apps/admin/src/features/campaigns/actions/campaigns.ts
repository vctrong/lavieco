"use server";

import { z } from "zod";

import { objectIdSchema } from "@lavieco/shared";
import {
  campaignAudienceSchema,
  campaignCreateRequestSchema,
  campaignSendRequestSchema,
  campaignTestRequestSchema,
  campaignUpdateRequestSchema,
  type AudiencePreview,
  type CampaignRendered,
  type CampaignView,
} from "@lavieco/shared/events";

import { identityClient, programClient } from "@/lib/services";

import { TEXT } from "../constants/text";
import { callCampaigns } from "../server/campaigns";
import type { CampaignActionResult } from "../types";

function fieldErrors(error: z.ZodError): CampaignActionResult<never> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    errors[issue.path.join(".")] ??= TEXT.vi.errors.invalid;
  }
  return { status: "invalid", fieldErrors: errors };
}

const notFound = { status: "error", reason: "not_found" } as const;

export async function createCampaign(input: unknown): Promise<CampaignActionResult<CampaignView>> {
  const parsed = campaignCreateRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callCampaigns("campaigns.create", (token, id) =>
    programClient().createCampaign(token, parsed.data, id),
  );
}

export async function updateCampaign(
  campaignId: unknown,
  input: unknown,
): Promise<CampaignActionResult<CampaignView>> {
  const id = objectIdSchema.safeParse(campaignId);
  if (!id.success) return notFound;
  const parsed = campaignUpdateRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callCampaigns("campaigns.update", (token, requestId) =>
    programClient().updateCampaign(token, id.data, parsed.data, requestId),
  );
}

export async function previewAudience(
  audience: unknown,
): Promise<CampaignActionResult<AudiencePreview>> {
  const parsed = campaignAudienceSchema.safeParse(audience);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callCampaigns("campaigns.preview", (token, id) =>
    programClient().previewAudience(token, { audience: parsed.data }, id),
  );
}

export async function renderCampaign(
  campaignId: unknown,
): Promise<CampaignActionResult<CampaignRendered>> {
  const id = objectIdSchema.safeParse(campaignId);
  if (!id.success) return notFound;
  return callCampaigns("campaigns.render", (token, requestId) =>
    programClient().renderCampaign(token, id.data, requestId),
  );
}

export async function testCampaign(
  campaignId: unknown,
  input: unknown,
): Promise<CampaignActionResult> {
  const id = objectIdSchema.safeParse(campaignId);
  if (!id.success) return notFound;
  const parsed = campaignTestRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callCampaigns("campaigns.test", async (token, requestId) => {
    await programClient().testCampaign(token, id.data, parsed.data, requestId);
    return undefined;
  });
}

const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/);

/** Step-up with the TOTP code (ADR-0021), then the service checks the typed count. */
export async function sendCampaign(
  campaignId: unknown,
  input: unknown,
  code: unknown,
): Promise<CampaignActionResult<CampaignView>> {
  const id = objectIdSchema.safeParse(campaignId);
  if (!id.success) return notFound;
  const parsed = campaignSendRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  const totp = codeSchema.safeParse(code);
  if (!totp.success) return { status: "error", reason: "code_invalid" };
  return callCampaigns("campaigns.send", async (token, requestId) => {
    const { stepUpToken } = await identityClient().stepUp(token, totp.data, requestId);
    return programClient().sendCampaign(token, id.data, parsed.data, stepUpToken, requestId);
  });
}

const moveSchema = z.enum(["pause", "resume", "cancel", "retry-failed"]);

export async function moveCampaign(
  campaignId: unknown,
  action: unknown,
): Promise<CampaignActionResult<CampaignView>> {
  const id = objectIdSchema.safeParse(campaignId);
  const move = moveSchema.safeParse(action);
  if (!id.success || !move.success) return notFound;
  return callCampaigns("campaigns.move", (token, requestId) =>
    programClient().moveCampaign(token, id.data, move.data, requestId),
  );
}
