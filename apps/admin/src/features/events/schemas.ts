import type { z } from "zod";

import { TEXT } from "./constants/text";

type Issue = z.core.$ZodIssue;

/** Vietnamese message for a Zod issue raised by the shared contracts. */
function messageFor(issue: Issue): string {
  const v = TEXT.vi.validation;
  if (issue.code === "too_small") return v.required;
  if (issue.code === "invalid_format") {
    if (issue.format === "url") return v.invalidUrl;
    if (issue.format === "datetime") return v.invalidDate;
    if (issue.format === "regex") return v.slug;
  }
  if (issue.code === "invalid_type") {
    return issue.expected === "number" ? v.invalidNumber : v.required;
  }
  if (issue.code === "custom" && issue.path.at(-1) === "endAt") return v.endAfterStart;
  if (issue.code === "custom" && issue.path.at(-1) === "saleEndAt") return v.endAfterStart;
  if (issue.code === "custom" && issue.path.at(-1) === "options") return v.options;
  return TEXT.vi.errors.invalid;
}

/**
 * Field errors keyed by full path (`venue.name`, `speakers.0.name`), in Vietnamese.
 * Used by the forms (UX) and again by the Server Actions (safety).
 */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".");
    if (path && !errors[path]) errors[path] = messageFor(issue);
  }
  return errors;
}
