import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import { cursorPageQuerySchema, cursorPageSchema } from "../common/pagination";
import { MEDIA_LIMITS } from "../media/limits";
import { mediaImageInputSchema, mediaImageSchema } from "../media/media.schema";
import {
  EVENT_STATUSES,
  benefitIconSchema,
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

/** Cover, banner, gallery or speaker image: snapshot of a content-service `media` (ADR-0020). */
export const eventImageSchema = mediaImageSchema;
export type EventImage = z.infer<typeof eventImageSchema>;

/** A person who guides the programme ("Người hướng dẫn"). */
export const eventSpeakerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().max(160).default(""),
  bio: z.string().trim().max(EVENT_LIMITS.speakerBioMax).default(""),
  /** A portrait is personal data: only uploaded with the person's consent. */
  avatar: eventImageSchema.nullable().default(null),
});
export type EventSpeaker = z.infer<typeof eventSpeakerSchema>;

/** What an editor sends for a speaker: the avatar as media id + alt, like the cover. */
export const eventSpeakerInputSchema = eventSpeakerSchema.extend({
  avatar: mediaImageInputSchema.nullable().default(null),
});
export type EventSpeakerInput = z.infer<typeof eventSpeakerInputSchema>;

export const eventAgendaItemSchema = z.object({
  /** Free label such as "09:00" or "Buổi sáng". */
  time: z.string().trim().max(40).default(""),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(EVENT_LIMITS.agendaDescriptionMax).default(""),
});
export type EventAgendaItem = z.infer<typeof eventAgendaItemSchema>;
export const eventFaqItemSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(2_000),
});
export type EventFaqItem = z.infer<typeof eventFaqItemSchema>;

/** One "Bạn sẽ nhận" item. */
export const eventBenefitSchema = z.object({
  icon: benefitIconSchema,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(EVENT_LIMITS.benefitTextMax).default(""),
});
export type EventBenefit = z.infer<typeof eventBenefitSchema>;

/** One row of the cancellation policy table, e.g. "Huỷ trước 72 giờ" → "Hoàn 100%". */
export const eventCancellationRuleSchema = z.object({
  condition: z.string().trim().min(1).max(200),
  result: z.string().trim().min(1).max(200),
});
export type EventCancellationRule = z.infer<typeof eventCancellationRuleSchema>;

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
  /** Free note shown under the rules table (or alone when there are no rules). */
  cancellationPolicy: z.string().trim().max(EVENT_LIMITS.cancellationPolicyMax).default(""),
  cancellationRules: z
    .array(eventCancellationRuleSchema)
    .max(EVENT_LIMITS.cancellationRulesMax)
    .default([]),
  /** Youngest suitable age, shown as "Từ N tuổi". Null = not stated. */
  minAge: z.number().int().min(0).max(EVENT_LIMITS.minAgeMax).nullable().default(null),
  benefits: z.array(eventBenefitSchema).max(EVENT_LIMITS.benefitsMax).default([]),
  /**
   * A programme for children: the booker confirms being their parent or guardian at
   * checkout. Nothing about the children themselves is ever asked (BR-08).
   */
  forChildren: z.boolean().default(false),
  speakers: z.array(eventSpeakerInputSchema).max(EVENT_LIMITS.speakersMax).default([]),
  agenda: z.array(eventAgendaItemSchema).max(EVENT_LIMITS.agendaMax).default([]),
  faq: z.array(eventFaqItemSchema).max(EVENT_LIMITS.faqMax).default([]),
  /** Poster, 4:5. Uploaded beforehand through content-service; attached on save. */
  cover: mediaImageInputSchema.nullable().default(null),
  /** Wide banner, 21:9: event page hero, featured block and share image. */
  banner: mediaImageInputSchema.nullable().default(null),
  gallery: galleryInputSchema.default([]),
  /**
   * Attendance of an archive-only (`past`) event, typed by hand; must be null for a
   * standard event, whose attendance is its checked-in tickets. Changing it drops the
   * approval (BR-09).
   */
  attendanceCount: z.number().int().min(0).max(EVENT_LIMITS.attendanceMax).nullable().default(null),
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

/**
 * Attendance typed for an archive-only event (BR-09): public only once a holder of
 * `impact:approve` approved this very count.
 */
export const eventAttendanceSchema = z.object({
  count: z.number().int().nullable(),
  approvedAt: isoDateTimeSchema.nullable(),
  approvedBy: z.string().nullable(),
});
export type EventAttendance = z.infer<typeof eventAttendanceSchema>;

/** Why and when a standard event was cancelled; the reason is shown publicly. */
export const eventCancellationSchema = z.object({
  reason: z.string(),
  at: isoDateTimeSchema,
});
export type EventCancellation = z.infer<typeof eventCancellationSchema>;

/** `POST /internal/v1/events/{id}/cancel` (step-up, ADR-0021). */
export const eventCancelRequestSchema = z.object({
  reason: z.string().trim().min(EVENT_LIMITS.cancelReasonMin).max(EVENT_LIMITS.cancelReasonMax),
  revision: z.number().int().min(1),
});
export type EventCancelRequest = z.infer<typeof eventCancelRequestSchema>;

/** Orders and tickets a cancellation would touch, shown before the admin confirms. */
export const eventCancelImpactSchema = z.object({
  paidOrders: z.number().int(),
  pendingOrders: z.number().int(),
  validTickets: z.number().int(),
});
export type EventCancelImpact = z.infer<typeof eventCancelImpactSchema>;

/** `POST /internal/v1/events/{id}/attendance/approve`: approves the count as it is now. */
export const eventAttendanceApproveRequestSchema = z.object({
  revision: z.number().int().min(1),
});
export type EventAttendanceApproveRequest = z.infer<typeof eventAttendanceApproveRequestSchema>;

/**
 * `isFree` = every visible ticket type is priced 0; `priceFrom` = the lowest visible
 * price (docs/03 §9.2; "every", not "any", since 22/10/2026).
 */
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
  cancellationRules: z.array(eventCancellationRuleSchema),
  minAge: z.number().int().nullable(),
  benefits: z.array(eventBenefitSchema),
  forChildren: z.boolean(),
  speakers: z.array(eventSpeakerSchema),
  agenda: z.array(eventAgendaItemSchema),
  faq: z.array(eventFaqItemSchema),
  cover: eventImageSchema.nullable(),
  banner: eventImageSchema.nullable(),
  gallery: z.array(eventImageSchema),
  attendance: eventAttendanceSchema,
  cancellation: eventCancellationSchema.nullable(),
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
