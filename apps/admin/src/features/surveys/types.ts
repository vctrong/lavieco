import type { TEXT } from "./constants/text";

export type SurveyFailure = keyof typeof TEXT.vi.errors;

export type SurveyActionResult<T = undefined> =
  | { status: "ok"; data: T }
  | { status: "invalid"; fieldErrors: Record<string, string> }
  | { status: "error"; reason: SurveyFailure; ref?: string };
