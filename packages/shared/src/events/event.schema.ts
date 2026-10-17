import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import { cursorPageQuerySchema, cursorPageSchema } from "../common/pagination";
import { MEDIA_LIMITS } from "../media/limits";
import { mediaImageInputSchema, mediaImageSchema } from "../media/media.schema";
import {
  EVENT_STATUSES,
  eventActionSchema,
  eventFormatSchema,
  eventKindSchema,
  eventStatusSchema,
  publishBlockerSchema,
  publishWarningSchema,
} from "./enums";
import { eventFormSchema } from "./event-form.schema";
import { EVENT_LIMITS } from "./limits";
import { ticketTypeSchema } from "./ticket-type.schema";

const httpUrlSchema = z.url({ protocol: /^https?$/ }).max(500);

export const eventSlugSchema = z
  .string()
  .min(3)
  .max(EVENT_LIMITS.slugMax)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lower-case letters, digits and single dashes");

export const eventVenueSchema = z.object({
  name: z.string().trim().min(1).max(160),
  address: z.string().trim().min(1).max(300),
  mapUrl: httpUrlSchema.nullable().default(null),
});
export type EventVenue = z.infer<typeof eventVenueSchema>;

export const eventSpeakerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().max(160).default(""),
});
export const eventAgendaItemSchema = z.object({
  /** Free label such as "09:00" or "Buổi sáng". */
  time: z.string().trim().max(40).default(""),
  title: z.string().trim().min(1).max(200),
});
export const eventFaqItemSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(2_000),
});

/** Cover or gallery image: snapshot of a content-service `media` (ADR-0020). */
export const eventImageSchema = mediaImageSchema;
export type EventImage = z.infer<typeof eventImageSchema>;

const galleryInputSchema = z
  .array(mediaImageInputSchema)
  .max(MEDIA_LIMITS.eventGalleryMax)
  .refine((items) => new Set(items.map((item) => item.mediaId)).size === items.length, {
    message: "An image appears twice in the gallery",
  });

const detailsShape = {
  title: z.string().trim().min(1).max(EVENT_LIMITS.titleMax),
  /** Generated from the title when omitted. Locked once the event has been published. */
  slug: eventSlugSchema.optional(),
  typeId: objectIdSchema,
  format: eventFormatSchema,
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
  venue: eventVenueSchema.nullable().default(null),
  /** Never shown publicly: only on tickets and in ticket emails (docs/05). */
  onlineUrl: httpUrlSchema.nullable().default(null),
  summary: z.string().trim().max(EVENT_LIMITS.summaryMax).default(""),
  /** Plain text, paragraphs separated by a blank line. TODO(PQ5): block editor. */
  description: z.string().trim().max(EVENT_LIMITS.descriptionMax).default(""),
  /** Optional. When set, the checkout asks to confirm it was read. */
  safetyNotes: z.string().trim().max(EVENT_LIMITS.safetyNotesMax).default(""),
  cancellationPolicy: z.string().trim().max(EVENT_LIMITS.cancellationPolicyMax).default(""),
  speakers: z.array(eventSpeakerSchema).max(EVENT_LIMITS.speakersMax).default([]),
  agenda: z.array(eventAgendaItemSchema).max(EVENT_LIMITS.agendaMax).default([]),
  faq: z.array(eventFaqItemSchema).max(EVENT_LIMITS.faqMax).default([]),
  /** Uploaded beforehand through content-service; program-service attaches it on save. */
  cover: mediaImageInputSchema.nullable().default(null),
  gallery: galleryInputSchema.default([]),
};

const startBeforeEnd = {
  check: (input: { startAt: string; endAt: string }) =>
    Date.parse(input.startAt) < Date.parse(input.endAt),
  params: { path: ["endAt"], message: "End must be after start" },
};

export const eventDetailsSchema = z
  .object(detailsShape)
  .refine(startBeforeEnd.check, startBeforeEnd.params);
export type EventDetails = z.infer<typeof eventDetailsSchema>;

export const eventCreateRequestSchema = z
  .object({ ...detailsShape, kind: eventKindSchema.default("standard") })
  .refine(startBeforeEnd.check, startBeforeEnd.params);
export type EventCreateRequest = z.infer<typeof eventCreateRequestSchema>;

export const eventUpdateRequestSchema = z
  .object({ ...detailsShape, revision: z.number().int().min(1) })
  .refine(startBeforeEnd.check, startBeforeEnd.params);
export type EventUpdateRequest = z.infer<typeof eventUpdateRequestSchema>;

export const eventStatusChangeRequestSchema = z.object({
  action: eventActionSchema,
  revision: z.number().int().min(1),
});
export type EventStatusChangeRequest = z.infer<typeof eventStatusChangeRequestSchema>;

export const eventRevisionRequestSchema = z.object({ revision: z.number().int().min(1) });
export type EventRevisionRequest = z.infer<typeof eventRevisionRequestSchema>;

/** `isFree` = the event has a visible ticket type priced 0 (docs/03 §9.2). */
export const eventPricingSchema = z.object({
  isFree: z.boolean(),
  priceFrom: z.number().int().nullable(),
});
export type EventPricing = z.infer<typeof eventPricingSchema>;

export const eventReadinessSchema = z.object({
  blockers: z.array(publishBlockerSchema),
  warnings: z.array(publishWarningSchema),
});
export type EventReadiness = z.infer<typeof eventReadinessSchema>;

/** Full admin view of one event. */
export const eventSchema = z.object({
  id: objectIdSchema,
  kind: eventKindSchema,
  slug: z.string(),
  slugLocked: z.boolean(),
  status: eventStatusSchema,
  title: z.string(),
  typeId: objectIdSchema,
  format: eventFormatSchema,
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
  venue: eventVenueSchema.nullable(),
  onlineUrl: z.string().nullable(),
  summary: z.string(),
  description: z.string(),
  safetyNotes: z.string(),
  cancellationPolicy: z.string(),
  speakers: z.array(eventSpeakerSchema),
  agenda: z.array(eventAgendaItemSchema),
  faq: z.array(eventFaqItemSchema),
  cover: eventImageSchema.nullable(),
  gallery: z.array(eventImageSchema),
  form: eventFormSchema,
  ticketTypes: z.array(ticketTypeSchema),
  pricing: eventPricingSchema,
  /** True once any seat is sold or held: unpublishing and form edits are restricted. */
  hasRegistrations: z.boolean(),
  readiness: eventReadinessSchema,
  publishedAt: isoDateTimeSchema.nullable(),
  revision: z.number().int(),
  /** Staff user ids only: staff tokens carry no display name to snapshot. */
  createdBy: z.object({ userId: objectIdSchema }),
  updatedBy: z.object({ userId: objectIdSchema }),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type EventView = z.infer<typeof eventSchema>;

export const eventListItemSchema = z.object({
  id: objectIdSchema,
  kind: eventKindSchema,
  slug: z.string(),
  status: eventStatusSchema,
  title: z.string(),
  typeId: objectIdSchema,
  format: eventFormatSchema,
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
  venueName: z.string().nullable(),
  cover: eventImageSchema.nullable(),
  pricing: eventPricingSchema,
  /** `capacity` null = unlimited (or no ticket type yet). */
  seats: z.object({ sold: z.number().int(), capacity: z.number().int().nullable() }),
  updatedAt: isoDateTimeSchema,
});
export type EventListItem = z.infer<typeof eventListItemSchema>;

export const eventListQuerySchema = cursorPageQuerySchema.extend({
  status: eventStatusSchema.optional(),
  kind: eventKindSchema.optional(),
  typeId: objectIdSchema.optional(),
  format: eventFormatSchema.optional(),
  q: z.string().trim().max(100).optional(),
});
export type EventListQuery = z.infer<typeof eventListQuerySchema>;

export const eventStatusCountsSchema = z.object(
  Object.fromEntries(["all", ...EVENT_STATUSES].map((key) => [key, z.number().int()])) as Record<
    "all" | (typeof EVENT_STATUSES)[number],
    z.ZodNumber
  >,
);
export type EventStatusCounts = z.infer<typeof eventStatusCountsSchema>;

export const eventListSchema = cursorPageSchema(eventListItemSchema).extend({
  counts: eventStatusCountsSchema,
});
export type EventList = z.infer<typeof eventListSchema>;

export const eventPreviewTokenSchema = z.object({
  token: z.string(),
  expiresAt: isoDateTimeSchema,
});
export type EventPreviewToken = z.infer<typeof eventPreviewTokenSchema>;
