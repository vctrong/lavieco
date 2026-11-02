import "server-only";

import { notFound, redirect } from "next/navigation";
import { toDataURL } from "qrcode";

import { isServiceProblem, type DownloadedFile } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";
import type { SurveyListQuery } from "@lavieco/shared/events";

import { failureKind, refOf } from "@/lib/action-errors";
import { serverEnv } from "@/lib/env";
import { requestId } from "@/lib/request-meta";
import { adminLogger, identityClient, programClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";

import type { SurveyActionResult, SurveyFailure } from "../types";

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

const isId = (value: string) => /^[0-9a-f]{24}$/.test(value);

export const loadSurveys = (query: Partial<SurveyListQuery>) =>
  read("/surveys", (token, id) => programClient().listSurveys(token, { limit: 20, ...query }, id));

export function loadSurvey(surveyId: string) {
  if (!isId(surveyId)) notFound();
  return read(`/surveys/${surveyId}`, (token, id) =>
    programClient().getSurvey(token, surveyId, id),
  );
}

export function loadSurveyResults(surveyId: string) {
  if (!isId(surveyId)) notFound();
  return read(`/surveys/${surveyId}/results`, async (token, id) => {
    const [survey, results] = await Promise.all([
      programClient().getSurvey(token, surveyId, id),
      programClient().getSurveyResults(token, surveyId, id),
    ]);
    return { survey, results };
  });
}

export const loadEventChoices = () =>
  read("/surveys/new", async (token, id) => {
    const page = await programClient().listEvents(token, { limit: 100 }, id);
    return page.items.map((event) => ({ id: event.id, title: event.title }));
  });

/** Feedback surveys of one event, and how many people came, for its editor. */
export function loadEventSurveys(eventId: string) {
  return read(`/events/${eventId}`, async (token, id) => {
    const [page, stats] = await Promise.all([
      programClient().listSurveys(token, { eventId, limit: 10 }, id),
      programClient().getCheckinStats(token, eventId, id),
    ]);
    return { surveys: page.items, checkedIn: stats.checkedIn };
  });
}

/** The public link of a survey and its QR, rendered on demand and never stored. */
export async function surveyLink(slug: string, width = 480) {
  const url = new URL(`/khao-sat/${slug}`, serverEnv().WEB_APP_URL).toString();
  return { url, qr: await toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width }) };
}

const FAILURE_BY_CODE: Partial<Record<ErrorCode, SurveyFailure>> = {
  "common.unauthenticated": "session_expired",
  "common.forbidden": "forbidden",
  "common.not_found": "not_found",
  "common.conflict": "conflict",
  "common.validation_failed": "invalid",
  "survey.slug_taken": "slug_taken",
  "survey.locked": "locked",
  "survey.no_questions": "no_questions",
  "auth.mfa_code_invalid": "code_invalid",
  "auth.account_locked": "locked_account",
};

export async function callSurveys<T>(
  context: string,
  run: (token: string, id: string) => Promise<T>,
): Promise<SurveyActionResult<T>> {
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
    adminLogger().warn("surveys action failed", {
      context,
      requestId: id,
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
      ...(isServiceProblem(error) ? {} : failureKind(error)),
    });
    return { status: "error", reason: "unavailable", ref: refOf(id) };
  }
}

/** Step-up with the TOTP code, then the file; program-service audits the export. */
export function exportSurvey(surveyId: string, code: string, format: "xlsx" | "csv") {
  return callSurveys<DownloadedFile>("surveys.export", async (token, id) => {
    const { stepUpToken } = await identityClient().stepUp(token, code, id);
    return programClient().exportSurvey(token, surveyId, { format, stepUpToken }, id);
  });
}
