import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import { cursorPageQuerySchema, cursorPageSchema } from "../common/pagination";

export const CAMPAIGN_LIMITS = {
  nameMax: 120,
  subjectMax: 150,
  preheaderMax: 200,
  bodyMax: 10_000,
  ctaLabelMax: 60,
  manualRecipientsMax: 2_000,
  recipientsPage: 100,
  samples: 5,
} as const;

export const CAMPAIGN_TYPES = ["thank_you", "feedback_invite", "announcement", "custom"] as const;
export const campaignTypeSchema = z.enum(CAMPAIGN_TYPES);
export type CampaignType = z.infer<typeof campaignTypeSchema>;

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "paused",
  "done",
  "cancelled",
] as const;
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

export const RECIPIENT_STATUSES = ["queued", "sending", "sent", "failed", "skipped"] as const;
export const recipientStatusSchema = z.enum(RECIPIENT_STATUSES);
export type RecipientStatus = z.infer<typeof recipientStatusSchema>;

export const CAMPAIGN_CHECKIN_FILTERS = ["all", "checked_in", "not_checked_in"] as const;

/** Who receives it. People are resolved when it is sent, then deduplicated. */
export const campaignAudienceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("event"),
    eventId: objectIdSchema,
    checkin: z.enum(CAMPAIGN_CHECKIN_FILTERS).default("all"),
    ticketTypeIds: z.array(objectIdSchema).max(50).default([]),
  }),
  z.object({
    type: z.literal("past_buyers"),
    from: isoDateTimeSchema.nullable().default(null),
    to: isoDateTimeSchema.nullable().default(null),
    minOrders: z.number().int().min(1).max(1_000).default(1),
  }),
  z.object({ type: z.literal("survey_respondents"), surveyId: objectIdSchema }),
  z.object({
    type: z.literal("manual"),
    /** One person per line, as `email` or `email,name`. Personal data. */
    entries: z
      .array(
        z.object({
          email: z.email().max(254),
          name: z.string().trim().max(120).default(""),
        }),
      )
      .min(1)
      .max(CAMPAIGN_LIMITS.manualRecipientsMax),
  }),
]);
export type CampaignAudience = z.infer<typeof campaignAudienceSchema>;

export const CAMPAIGN_CTA_LINKS = ["url", "ticket", "survey"] as const;

export const campaignCtaSchema = z
  .object({
    label: z.string().trim().min(1).max(CAMPAIGN_LIMITS.ctaLabelMax),
    /** A fixed address, or each person's own ticket or survey link. */
    link: z.enum(CAMPAIGN_CTA_LINKS),
    url: z
      .url({ protocol: /^https?$/ })
      .max(500)
      .nullable()
      .default(null),
  })
  .refine((cta) => cta.link !== "url" || cta.url !== null, {
    path: ["url"],
    message: "Address required",
  });
export type CampaignCta = z.infer<typeof campaignCtaSchema>;

const campaignShape = {
  name: z.string().trim().min(1).max(CAMPAIGN_LIMITS.nameMax),
  type: campaignTypeSchema,
  audience: campaignAudienceSchema,
  subject: z.string().trim().min(1).max(CAMPAIGN_LIMITS.subjectMax),
  preheader: z.string().trim().max(CAMPAIGN_LIMITS.preheaderMax).default(""),
  /** Plain text with variables; a blank line starts a new paragraph. Never HTML. */
  body: z.string().trim().min(1).max(CAMPAIGN_LIMITS.bodyMax),
  cta: campaignCtaSchema.nullable().default(null),
  /** The event behind `{{chuong_trinh}}` and `{{ngay}}`, when there is one. */
  eventId: objectIdSchema.nullable().default(null),
  /** The survey behind `{{link_khao_sat}}`. */
  surveyId: objectIdSchema.nullable().default(null),
};

export const campaignCreateRequestSchema = z.object(campaignShape);
export type CampaignCreateRequest = z.infer<typeof campaignCreateRequestSchema>;

export const campaignUpdateRequestSchema = z.object({
  ...campaignShape,
  revision: z.number().int().min(1),
});
export type CampaignUpdateRequest = z.infer<typeof campaignUpdateRequestSchema>;

export const campaignCountersSchema = z.object({
  total: z.number().int(),
  sent: z.number().int(),
  failed: z.number().int(),
  skipped: z.number().int(),
});
export type CampaignCounters = z.infer<typeof campaignCountersSchema>;

export const campaignSchema = z.object({
  id: objectIdSchema,
  name: z.string(),
  type: campaignTypeSchema,
  audience: campaignAudienceSchema,
  subject: z.string(),
  preheader: z.string(),
  body: z.string(),
  cta: campaignCtaSchema.nullable(),
  eventId: objectIdSchema.nullable(),
  surveyId: objectIdSchema.nullable(),
  scheduledAt: isoDateTimeSchema.nullable(),
  status: campaignStatusSchema,
  /** Created by "Sau sự kiện": a draft waits for someone to review and send it. */
  source: z.enum(["manual", "post_event"]),
  counters: campaignCountersSchema,
  /** Days this will take at the current limits, while it is not finished. */
  estimatedDays: z.number().int(),
  revision: z.number().int(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type CampaignView = z.infer<typeof campaignSchema>;

export const campaignListQuerySchema = cursorPageQuerySchema.extend({
  status: campaignStatusSchema.optional(),
});
export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>;
export const campaignListSchema = cursorPageSchema(campaignSchema);
export type CampaignList = z.infer<typeof campaignListSchema>;

export const audiencePreviewRequestSchema = z.object({ audience: campaignAudienceSchema });
export type AudiencePreviewRequest = z.infer<typeof audiencePreviewRequestSchema>;

/** Before sending: how many, a few examples, and how long it will take. */
export const audiencePreviewSchema = z.object({
  count: z.number().int(),
  suppressed: z.number().int(),
  duplicates: z.number().int(),
  samples: z.array(z.object({ email: z.string(), name: z.string() })),
  estimatedDays: z.number().int(),
});
export type AudiencePreview = z.infer<typeof audiencePreviewSchema>;

export const campaignRenderedSchema = z.object({
  subject: z.string(),
  html: z.string(),
  text: z.string(),
});
export type CampaignRendered = z.infer<typeof campaignRenderedSchema>;

export const campaignTestRequestSchema = z.object({ email: z.email().max(254) });
export type CampaignTestRequest = z.infer<typeof campaignTestRequestSchema>;

/**
 * "Gửi": step-up (ADR-0021), and the sender types the number of recipients, which must
 * match what the service counts now. `scheduledAt` null = right away.
 */
export const campaignSendRequestSchema = z.object({
  confirmCount: z.number().int().min(1),
  scheduledAt: isoDateTimeSchema.nullable().default(null),
  revision: z.number().int().min(1),
});
export type CampaignSendRequest = z.infer<typeof campaignSendRequestSchema>;

export const campaignRevisionRequestSchema = z.object({ revision: z.number().int().min(1) });
export type CampaignRevisionRequest = z.infer<typeof campaignRevisionRequestSchema>;

export const campaignRecipientListQuerySchema = cursorPageQuerySchema.extend({
  status: recipientStatusSchema.optional(),
});
export type CampaignRecipientListQuery = z.infer<typeof campaignRecipientListQuerySchema>;

export const campaignRecipientSchema = z.object({
  id: objectIdSchema,
  email: z.string(),
  name: z.string(),
  status: recipientStatusSchema,
  /** A delivery failure code, never a provider's text (it may echo addresses). */
  error: z.string().nullable(),
  sentAt: isoDateTimeSchema.nullable(),
});
export type CampaignRecipient = z.infer<typeof campaignRecipientSchema>;

export const campaignRecipientListSchema = cursorPageSchema(campaignRecipientSchema);
export type CampaignRecipientList = z.infer<typeof campaignRecipientListSchema>;

/** The token of a one-click unsubscribe link: a recipient id and its signature, no email. */
export const unsubscribeTokenSchema = z
  .string()
  .min(20)
  .max(200)
  .regex(/^[A-Za-z0-9_.-]+$/);

export const unsubscribeRequestSchema = z.object({ token: unsubscribeTokenSchema });
export type UnsubscribeRequest = z.infer<typeof unsubscribeRequestSchema>;

/** "Sau sự kiện" on an event: what to create once it has ended. */
export const EVENT_POST_AUDIENCES = ["checked_in", "all_buyers"] as const;
export const EVENT_POST_MODES = ["draft", "send"] as const;

export const eventPostEventSchema = z.object({
  enabled: z.boolean().default(false),
  delayHours: z.number().int().min(0).max(720).default(24),
  audience: z.enum(EVENT_POST_AUDIENCES).default("checked_in"),
  surveyId: objectIdSchema.nullable().default(null),
  /** `draft`: created and waits for review (default). `send`: goes out by itself. */
  mode: z.enum(EVENT_POST_MODES).default("draft"),
});
export type EventPostEvent = z.infer<typeof eventPostEventSchema>;
