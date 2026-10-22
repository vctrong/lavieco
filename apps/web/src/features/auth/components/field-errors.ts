import type { z } from "zod";

/** First Zod message per field (client-side validation, UX only). */
export function toClientFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/** The errors of a form read from the DOM, checked with the same schema as the action. */
export function formErrorsOf(schema: z.ZodType, form: HTMLFormElement): Record<string, string> {
  const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
  return parsed.success ? {} : toClientFieldErrors(parsed.error);
}
