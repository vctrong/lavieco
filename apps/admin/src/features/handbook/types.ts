import type { TEXT } from "./constants/text";

export type HandbookFailure = keyof typeof TEXT.vi.errors;

export type HandbookResult<T = undefined> =
  | { status: "ok"; data: T }
  | { status: "error"; reason: HandbookFailure; ref?: string; detail?: string };

/** What the signed-in person may do on the handbook screens (UX only; the service decides). */
export type HandbookAbilities = { write: boolean; publish: boolean };
