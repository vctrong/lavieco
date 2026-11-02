import "server-only";

import { notFound, redirect } from "next/navigation";

import { isServiceProblem } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";
import type { CampaignListQuery, CampaignRecipientListQuery } from "@lavieco/shared/events";

import { failureKind, refOf } from "@/lib/action-errors";
import { requestId } from "@/lib/request-meta";
import { adminLogger, programClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";

import type { CampaignActionResult, CampaignFailure } from "../types";

async function read<T>(path: string, run: (token: string, id: string) => Promise<T>): Promise<T> {
  const { accessToken, refreshToken } = await readStaffSession();
  const refresh = `/api/auth/refresh?next=${encodeURIComponent(path)}`;
  if (!accessToken) redirect(refreshToken ? refresh : "/login");
  try {
    return await run(accessToken, await requestId());
  } catch (error) {
    if (isServiceProblem(error) && error.status === 401) {
      redirect(refreshToken ? refresh : "/login");
    }
    if (isServiceProblem(error) && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }
}

export const loadCampaigns = (query: Partial<CampaignListQuery>) =>
  read("/campaigns", (token, id) =>
    programClient().listCampaigns(token, { limit: 20, ...query }, id),
  );

/** What the form offers: events and surveys to attach. */
export const loadCampaignChoices = (path: string) =>
  read(path, async (token, id) => {
    const [events, surveys] = await Promise.all([
      programClient().listEvents(token, { limit: 100 }, id),
      programClient().listSurveys(token, { limit: 100 }, id),
    ]);
    return {
      events: events.items.map((event) => ({ id: event.id, title: event.title })),
      surveys: surveys.items.map((survey) => ({ id: survey.id, title: survey.title })),
    };
  });

export function loadCampaign(campaignId: string, query: Partial<CampaignRecipientListQuery>) {
  if (!/^[0-9a-f]{24}$/.test(campaignId)) notFound();
  return read(`/campaigns/${campaignId}`, async (token, id) => {
    const [campaign, recipients] = await Promise.all([
      programClient().getCampaign(token, campaignId, id),
      programClient().listCampaignRecipients(token, campaignId, { limit: 50, ...query }, id),
    ]);
    return { campaign, recipients };
  });
}

const FAILURE_BY_CODE: Partial<Record<ErrorCode, CampaignFailure>> = {
  "common.unauthenticated": "session_expired",
  "common.forbidden": "forbidden",
  "common.not_found": "not_found",
  "common.conflict": "conflict",
  "common.validation_failed": "invalid",
  "campaign.invalid_state": "invalid_state",
  "campaign.empty": "empty",
  "campaign.count_mismatch": "count_mismatch",
  "auth.mfa_code_invalid": "code_invalid",
  "auth.account_locked": "locked",
};

export async function callCampaigns<T>(
  context: string,
  run: (token: string, id: string) => Promise<T>,
): Promise<CampaignActionResult<T>> {
  const id = await requestId();
  try {
    const { accessToken } = await readStaffSession();
    if (!accessToken) return { status: "error", reason: "session_expired" };
    return { status: "ok", data: await run(accessToken, id) };
  } catch (error) {
    if (isServiceProblem(error)) {
      const reason = FAILURE_BY_CODE[error.code];
      if (reason) return { status: "error", reason };
    }
    adminLogger().warn("campaigns action failed", {
      context,
      requestId: id,
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
      ...(isServiceProblem(error) ? {} : failureKind(error)),
    });
    return { status: "error", reason: "unavailable", ref: refOf(id) };
  }
}
