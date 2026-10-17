import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";

/** Short ticket code printed under the QR, e.g. `LVC-7K3Q9M` (Crockford Base32, random). */
export const TICKET_CODE_PATTERN = /^LVC-[0-9A-HJKMNP-TV-Z]{6}$/;

export const ticketCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(TICKET_CODE_PATTERN, "Expected a ticket code like LVC-7K3Q9M");

/**
 * Door check-in (`checkin:perform`): the scanned QR token, or the code typed by hand.
 * The ticket must belong to `eventId`.
 */
export const checkinRequestSchema = z
  .object({
    eventId: objectIdSchema,
    qrToken: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{43,64}$/)
      .optional(),
    code: ticketCodeSchema.optional(),
  })
  .refine((input) => (input.qrToken === undefined) !== (input.code === undefined), {
    message: "Send either qrToken or code",
  });
export type CheckinRequest = z.infer<typeof checkinRequestSchema>;

/**
 * Three outcomes, none of them an HTTP error: scanning a used ticket again answers
 * "đã check-in lúc …" with the first time.
 */
export const CHECKIN_RESULTS = ["valid", "already_used", "invalid"] as const;

export const checkinResponseSchema = z.object({
  result: z.enum(CHECKIN_RESULTS),
  ticket: z
    .object({
      code: z.string(),
      ticketTypeName: z.string(),
      buyerName: z.string(),
      checkedInAt: isoDateTimeSchema.nullable(),
    })
    .nullable(),
  stats: z.object({ checkedIn: z.number().int(), total: z.number().int() }),
});
export type CheckinResponse = z.infer<typeof checkinResponseSchema>;

export const checkinStatsSchema = z.object({
  checkedIn: z.number().int(),
  total: z.number().int(),
});
export type CheckinStats = z.infer<typeof checkinStatsSchema>;
