import "server-only";

import { isServiceProblem } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";

import { adminLogger } from "@/lib/services";

import type { ActionResult, EventFailure } from "../types";

const FAILURE_BY_CODE: Partial<Record<ErrorCode, EventFailure>> = {
  "common.unauthenticated": "session_expired",
  "common.forbidden": "forbidden",
  "common.not_found": "not_found",
  "common.conflict": "conflict",
  "common.validation_failed": "invalid",
  "event.invalid_transition": "invalid_transition",
  "event.has_registrations": "has_registrations",
  "event.not_publishable": "not_publishable",
  "event.form_locked": "form_locked",
  "event.slug_taken": "slug_taken",
  "event.slug_locked": "slug_locked",
  "event.type_unavailable": "type_unavailable",
  "event.past_event_restricted": "past_event_restricted",
  "event.discard_not_allowed": "discard_not_allowed",
  "ticket_type.locked": "ticket_locked",
  "ticket_type.limit_reached": "ticket_limit",
  "event_type.name_taken": "type_name_taken",
};

/** Maps a program-service failure to copy the forms can show; logs codes only. */
export function toFailure(error: unknown, context: string): ActionResult<never> {
  if (isServiceProblem(error)) {
    const reason = FAILURE_BY_CODE[error.code];
    if (reason) return { status: "error", reason };
  }
  adminLogger().warn("events action failed", {
    context,
    errorCode: isServiceProblem(error) ? error.code : "unavailable",
  });
  return { status: "error", reason: "unavailable" };
}
