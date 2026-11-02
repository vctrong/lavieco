import type { TEXT } from "./constants/text";

export type VoucherFailure = keyof typeof TEXT.vi.errors;

export type VoucherActionResult<T = undefined> =
  | { status: "ok"; data: T }
  | { status: "invalid"; fieldErrors: Record<string, string> }
  | { status: "error"; reason: VoucherFailure; ref?: string };
