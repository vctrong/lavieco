import { FORM_TEXT } from "@/shared/constants/form-text";

import { TEXT } from "../constants/text";
import type { ShopActionResult } from "../types";

type Failed = Exclude<ShopActionResult<unknown>, { status: "ok" }>;
type Thrown = { status: "error"; reason: "stale_version" | "offline" | "unavailable" };

/** One Vietnamese sentence for a failed action (with the request reference when we have one). */
export function failureText(result: Failed | Thrown): string {
  if (result.status === "invalid") return TEXT.vi.errors.invalid;
  const base = TEXT.vi.errors[result.reason];
  const ref = "ref" in result ? result.ref : undefined;
  return ref ? `${base} ${FORM_TEXT.vi.failures.reference(ref)}` : base;
}
