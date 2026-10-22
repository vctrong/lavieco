import "server-only";

import { isServiceProblem } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";

import { failureKind, refOf } from "@/lib/action-errors";
import { adminLogger } from "@/lib/services";

import type { ActionResult, TicketingFailure } from "../types";

const FAILURE_BY_CODE: Partial<Record<ErrorCode, TicketingFailure>> = {
  "common.unauthenticated": "session_expired",
  "common.forbidden": "forbidden",
  "common.not_found": "not_found",
  "common.conflict": "conflict",
  "common.validation_failed": "invalid",
  "common.rate_limited": "rate_limited",
  "order.invalid_state": "invalid_state",
  "auth.step_up_required": "step_up_required",
  "auth.mfa_code_invalid": "code_invalid",
  "auth.account_locked": "locked",
  "payment.unavailable": "payment_unavailable",
};

/** Maps a service failure to copy the screens can show; logs codes only, never data. */
export function toFailure(
  error: unknown,
  context: string,
  requestId?: string,
): ActionResult<never> {
  if (isServiceProblem(error)) {
    const reason = FAILURE_BY_CODE[error.code];
    if (reason) return { status: "error", reason };
  }
  adminLogger().warn("ticketing action failed", {
    context,
    errorCode: isServiceProblem(error) ? error.code : "unavailable",
    ...(requestId ? { requestId } : {}),
    ...(isServiceProblem(error) ? {} : failureKind(error)),
  });
  return {
    status: "error",
    reason: "unavailable",
    ...(requestId ? { ref: refOf(requestId) } : {}),
  };
}
