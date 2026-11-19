import type { ThrownFailure } from "@/shared/call-action";

import { TEXT } from "../constants/text";
import type { SalesFailure } from "../types";

const t = TEXT.vi.errors;

/** One sentence for a failed action, with the reference when the server gave one. */
export function failureMessage(result: {
  reason: SalesFailure | ThrownFailure["reason"];
  ref?: string;
}): string {
  const text = t[result.reason];
  return result.ref ? `${text} ${t.ref(result.ref)}` : text;
}
