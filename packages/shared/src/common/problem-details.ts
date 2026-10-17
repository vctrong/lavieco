import { z } from "zod";

import { ERROR_CATALOG } from "./error-catalog";

const errorCodes = Object.keys(ERROR_CATALOG) as [keyof typeof ERROR_CATALOG];

/** One invalid field of a request, reported in `errors` of a 400 response. */
export const fieldErrorSchema = z.object({
  path: z.string(),
  message: z.string(),
});

/**
 * Error body of every service (RFC 9457, `application/problem+json`), docs/02 §6.1.
 * `code` is the stable machine-readable key the frontend maps to Vietnamese copy.
 */
export const problemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: z.enum(errorCodes),
  detail: z.string().optional(),
  instance: z.string().optional(),
  traceId: z.string().optional(),
  errors: z.array(fieldErrorSchema).optional(),
  retryAfterSeconds: z.number().int().nonnegative().optional(),
  /** OTP checks: how many tries remain on this challenge. */
  remainingAttempts: z.number().int().nonnegative().optional(),
});

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
export type FieldError = z.infer<typeof fieldErrorSchema>;

export const PROBLEM_CONTENT_TYPE = "application/problem+json";
