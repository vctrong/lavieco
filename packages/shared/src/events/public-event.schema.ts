import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import { cursorPageSchema } from "../common/pagination";
import { eventFormatSchema, eventKindSchema, eventStatusSchema, questionTypeSchema } from "./enums";
import {
  eventAgendaItemSchema,
  eventImageSchema,
  eventFaqItemSchema,
  eventPricingSchema,
  eventSpeakerSchema,
} from "./event.schema";
import { publicEventTypeSchema } from "./event-type.schema";
import { registrationBlockerSchema } from "./order.schema";

/**
 * Seat information shown publicly: `seatsLeft` is only given when a few seats remain
 * (≤ EVENT_LIMITS.fewSeatsThreshold), never for unlimited events. Raw counters stay private.
 */
export const publicAvailabilitySchema = z.object({
  soldOut: z.boolean(),
  seatsLeft: z.number().int().nullable(),
});
export type PublicAvailability = z.infer<typeof publicAvailabilitySchema>;

/** Card on `/chuong-trinh`. Only published, closed or ended events (S3). */
export const publicEventCardSchema = z.object({
  slug: z.string(),
  kind: eventKindSchema,
  status: eventStatusSchema,
  title: z.string(),
  type: publicEventTypeSchema.nullable(),
  format: eventFormatSchema,
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
  venue: z.object({ name: z.string(), address: z.string() }).nullable(),
  summary: z.string(),
  cover: eventImageSchema.nullable(),
  pricing: eventPricingSchema,
  availability: publicAvailabilitySchema,
});
export type PublicEventCard = z.infer<typeof publicEventCardSchema>;

export const publicTicketTypeSchema = z.object({
  id: objectIdSchema,
  name: z.string(),
  description: z.string(),
  price: z.number().int(),
  saleStartAt: isoDateTimeSchema.nullable(),
  saleEndAt: isoDateTimeSchema.nullable(),
  maxPerOrder: z.number().int(),
  availability: publicAvailabilitySchema,
});
export type PublicTicketType = z.infer<typeof publicTicketTypeSchema>;

/** A visible custom question as the checkout renders it (hidden ones never leave the service). */
export const publicFormQuestionSchema = z.object({
  id: z.uuid(),
  type: questionTypeSchema,
  label: z.string(),
  description: z.string(),
  required: z.boolean(),
  options: z.array(z.object({ id: z.uuid(), label: z.string() })),
});
export type PublicFormQuestion = z.infer<typeof publicFormQuestionSchema>;

/**
 * Whether the event takes registrations now, and what the checkout asks besides the
 * fixed booker fields. `blocker` explains a closed registration ("Sắp mở đăng ký").
 */
export const publicRegistrationSchema = z.object({
  open: z.boolean(),
  blocker: registrationBlockerSchema.nullable(),
  questions: z.array(publicFormQuestionSchema),
  safetyAcknowledgementRequired: z.boolean(),
  /** `forChildren`: the booker must tick "Tôi là phụ huynh/người giám hộ". */
  guardianConfirmationRequired: z.boolean(),
});
export type PublicRegistration = z.infer<typeof publicRegistrationSchema>;

/**
 * Event page. Deliberately has no `onlineUrl`, no authors, no history, no hidden
 * questions and no raw seat counters.
 */
export const publicEventDetailSchema = publicEventCardSchema.extend({
  venue: z
    .object({ name: z.string(), address: z.string(), mapUrl: z.string().nullable() })
    .nullable(),
  description: z.string(),
  safetyNotes: z.string(),
  cancellationPolicy: z.string(),
  speakers: z.array(eventSpeakerSchema),
  agenda: z.array(eventAgendaItemSchema),
  faq: z.array(eventFaqItemSchema),
  gallery: z.array(eventImageSchema),
  ticketTypes: z.array(publicTicketTypeSchema),
  registration: publicRegistrationSchema,
});
export type PublicEventDetail = z.infer<typeof publicEventDetailSchema>;

export const PUBLIC_EVENT_SCOPES = ["upcoming", "past"] as const;

export const publicEventListQuerySchema = z.object({
  /** `upcoming` = published or closed; `past` = ended (incl. archive-only events). */
  scope: z.enum(PUBLIC_EVENT_SCOPES).default("upcoming"),
  typeId: objectIdSchema.optional(),
  format: eventFormatSchema.optional(),
  free: z.stringbool().optional(),
  /** Calendar month in Asia/Ho_Chi_Minh, `YYYY-MM`. */
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type PublicEventListQuery = z.infer<typeof publicEventListQuerySchema>;

export const publicEventListSchema = cursorPageSchema(publicEventCardSchema);
export type PublicEventList = z.infer<typeof publicEventListSchema>;
