import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import { EVENT_LIMITS } from "./limits";

/** What an admin edits on a ticket type. Prices are whole VND (docs/03 §1.2). */
export const ticketTypeInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).default(""),
    price: z.number().int().min(0).max(EVENT_LIMITS.priceMax),
    /** `null` = no limit (exhibitions). No waiting list (docs/05). */
    quantity: z.number().int().min(1).max(EVENT_LIMITS.quantityMax).nullable(),
    saleStartAt: isoDateTimeSchema.nullable().default(null),
    saleEndAt: isoDateTimeSchema.nullable().default(null),
    maxPerOrder: z.number().int().min(1).max(EVENT_LIMITS.maxPerOrderMax),
    sortOrder: z.number().int().min(0).max(999).default(0),
    hidden: z.boolean().default(false),
  })
  .refine(
    (input) =>
      input.saleStartAt === null ||
      input.saleEndAt === null ||
      Date.parse(input.saleStartAt) < Date.parse(input.saleEndAt),
    { path: ["saleEndAt"], message: "Sale end must be after sale start" },
  );
export type TicketTypeInput = z.infer<typeof ticketTypeInputSchema>;

export const ticketTypeCreateRequestSchema = ticketTypeInputSchema;
export type TicketTypeCreateRequest = z.infer<typeof ticketTypeCreateRequestSchema>;

export const ticketTypeUpdateRequestSchema = z.intersection(
  ticketTypeInputSchema,
  z.object({ revision: z.number().int().min(1) }),
);
export type TicketTypeUpdateRequest = z.infer<typeof ticketTypeUpdateRequestSchema>;

/** Admin view of a ticket type, with its counters. */
export const ticketTypeSchema = z.object({
  id: objectIdSchema,
  eventId: objectIdSchema,
  name: z.string(),
  description: z.string(),
  price: z.number().int(),
  quantity: z.number().int().nullable(),
  saleStartAt: isoDateTimeSchema.nullable(),
  saleEndAt: isoDateTimeSchema.nullable(),
  maxPerOrder: z.number().int(),
  sortOrder: z.number().int(),
  hidden: z.boolean(),
  sold: z.number().int(),
  held: z.number().int(),
  revision: z.number().int(),
});
export type TicketType = z.infer<typeof ticketTypeSchema>;

export const ticketTypeListSchema = z.object({ items: z.array(ticketTypeSchema) });
export type TicketTypeList = z.infer<typeof ticketTypeListSchema>;
