import { z } from "zod";

import { FORM_TEXT } from "./constants/form-text";

/**
 * Vietnamese message for any Zod issue whose schema did not set one, so a raw Zod
 * text ("Invalid input: expected string, received undefined") never reaches a form.
 * Schemas keep their own precise messages: those take precedence over this map.
 */
export const viErrorMap: z.core.$ZodErrorMap = (issue) => {
  const t = FORM_TEXT.vi.validation;
  switch (issue.code) {
    case "invalid_type":
      return issue.input === undefined || issue.input === null || issue.input === ""
        ? t.required
        : t.invalid;
    case "too_small": {
      const minimum = Number(issue.minimum);
      if (issue.origin === "string") return minimum <= 1 ? t.required : t.tooShort(minimum);
      if (issue.origin === "array" || issue.origin === "set") return t.pickAtLeast(minimum);
      return t.atLeast(minimum);
    }
    case "too_big": {
      const maximum = Number(issue.maximum);
      if (issue.origin === "string") return t.tooLong(maximum);
      if (issue.origin === "array" || issue.origin === "set") return t.pickAtMost(maximum);
      return t.atMost(maximum);
    }
    case "invalid_format":
      return issue.format === "email" ? t.email : t.format;
    case "invalid_value":
      return t.choose;
    default:
      return t.invalid;
  }
};

// Every form schema of the app imports this module first, on the server and in the
// browser alike, so the map is set before any parse.
z.config({ customError: viErrorMap });
