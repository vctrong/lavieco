import { FORM_TEXT } from "./constants/form-text";

/**
 * Failures every form can meet, whatever it does. Each feature adds its own reasons;
 * these keep one wording across the site.
 */
export type CommonFailure =
  | "unavailable"
  | "stale_version"
  | "offline"
  | "bot"
  | "rate_limited"
  | "code_not_sent"
  | "invalid_input";

export type FailureDetail = {
  retryAfterSeconds?: number;
  /** Short reference of the request (start of its `x-request-id`), to find it in logs. */
  ref?: string;
};

/** What a form shows for a failed submit: the message, and a reload button when stale. */
export type FormFailure = { message: string; reload: boolean };

/** Vietnamese message for a common failure. */
export function commonFailureMessage(reason: CommonFailure, detail: FailureDetail = {}): string {
  const t = FORM_TEXT.vi.failures;
  switch (reason) {
    case "unavailable":
      return detail.ref ? `${t.unavailable} ${t.reference(detail.ref)}` : t.unavailable;
    case "rate_limited":
      return detail.retryAfterSeconds !== undefined
        ? t.rate_limited_in(detail.retryAfterSeconds)
        : t.rate_limited;
    case "stale_version":
    case "offline":
    case "bot":
    case "code_not_sent":
    case "invalid_input":
      return t[reason];
  }
}
