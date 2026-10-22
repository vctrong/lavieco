import { FORM_TEXT } from "@/shared/constants/form-text";

import { TEXT } from "../constants/text";
import type { TicketingFailure } from "../types";

/** Message of a failed action; a real outage also gets its short log reference. */
export function failureText(error: { reason: TicketingFailure; ref?: string }): string {
  const message: string = TEXT.vi.errors[error.reason];
  return error.reason === "unavailable" && error.ref
    ? `${message} ${FORM_TEXT.vi.failures.reference(error.ref)}`
    : message;
}
