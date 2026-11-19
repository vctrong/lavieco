import type { TEXT } from "./constants/text";

export type SalesFailure = keyof Omit<typeof TEXT.vi.errors, "ref">;

export type SalesActionResult<T = undefined> =
  { status: "ok"; data: T } | { status: "error"; reason: SalesFailure; ref?: string };
