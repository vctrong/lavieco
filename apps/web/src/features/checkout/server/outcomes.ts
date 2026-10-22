import "server-only";

import type { z } from "zod";

import { isServiceProblem } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";

import { failureKind, guarded as guard, refOf } from "@/lib/action-errors";
import { webLogger } from "@/lib/services";

import { TEXT } from "../constants/text";
import { fieldErrorsOf, fieldKeyOf } from "../schemas";
import type { CheckoutError, CheckoutFailure, FieldErrors } from "../types";

const FAILURE_BY_CODE: Partial<Record<ErrorCode, CheckoutFailure>> = {
  "otp.code_invalid": "code_invalid",
  "otp.expired": "code_expired",
  "otp.attempts_exceeded": "attempts_exceeded",
  "otp.send_limited": "send_limited",
  "otp.verification_invalid": "verification_invalid",
  "order.sold_out": "sold_out",
  "order.items_invalid": "items_invalid",
  "order.answers_invalid": "answers_invalid",
  "order.consent_required": "consent_required",
  "order.registration_closed": "registration_closed",
  "order.email_mismatch": "email_mismatch",
  "order.invalid_state": "invalid_state",
  "payment.unavailable": "payment_unavailable",
  "common.rate_limited": "rate_limited",
};

/** Steps whose call asks identity to email a code: a 503 there means "code not sent". */
const SENDS_CODE = new Set(["checkout.request_code", "lookup.request_code"]);

/** Field message for a path the service refused (its own text is English, never shown). */
function serviceFieldMessage(field: string): string {
  const v = TEXT.vi.validation;
  switch (field) {
    case "fullName":
      return v.fullName;
    case "email":
      return v.email;
    case "phone":
      return v.phone;
    case "tickets":
      return TEXT.vi.errors.items_invalid;
    case "dataConsent":
    case "safety":
    case "guardian":
      return v.consent;
    default:
      return v.invalid;
  }
}

/** `common.validation_failed` as inline errors under the fields it names, when it does. */
function validationErrors(errors: { path: string }[] | undefined): FieldErrors | null {
  const fieldErrors: Record<string, string> = {};
  for (const { path } of errors ?? []) {
    const field = fieldKeyOf(path);
    if (field && !fieldErrors[field]) fieldErrors[field] = serviceFieldMessage(field);
  }
  return Object.keys(fieldErrors).length > 0 ? { status: "invalid", fieldErrors } : null;
}

/**
 * A service error as a failure the UI can explain. Anything unexpected is logged with
 * the request id, without personal data, and shown as "try again later" with a short
 * reference, never as raw detail.
 */
export function toCheckoutError(
  error: unknown,
  context: string,
  requestId?: string,
): CheckoutError | FieldErrors {
  if (isServiceProblem(error)) {
    const reason = FAILURE_BY_CODE[error.code];
    if (reason) {
      const { retryAfterSeconds, remainingAttempts } = error.problem;
      return {
        status: "error",
        reason,
        ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
        ...(remainingAttempts !== undefined ? { remainingAttempts } : {}),
      };
    }
    if (error.code === "common.validation_failed") {
      return validationErrors(error.problem.errors) ?? { status: "error", reason: "invalid_input" };
    }
  }
  const codeNotSent =
    isServiceProblem(error) && error.code === "common.unavailable" && SENDS_CODE.has(context);
  webLogger().warn("checkout step failed", {
    context,
    errorCode: isServiceProblem(error) ? error.code : "unavailable",
    ...(requestId ? { requestId } : {}),
    ...(isServiceProblem(error) ? {} : failureKind(error)),
  });
  return {
    status: "error",
    reason: codeNotSent ? "code_not_sent" : "unavailable",
    ...(requestId ? { ref: refOf(requestId) } : {}),
  };
}

/** Inline errors per form field (`buyer.email` → `email`), from a failed parse. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  return { status: "invalid", fieldErrors: fieldErrorsOf(error) };
}

/**
 * Runs a server action body so that it never throws to the browser: an unexpected
 * error (a bug, a dropped connection) becomes a logged, referenced "unavailable".
 */
export function guarded<T>(
  context: string,
  requestId: string,
  body: () => Promise<T>,
): Promise<T | CheckoutError | FieldErrors> {
  return guard(body, (error) => toCheckoutError(error, context, requestId));
}
