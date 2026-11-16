import { z } from "zod";

import { isoDateTimeSchema } from "../common/object-id";
import type { Permission } from "../permissions/permission";

/**
 * Staff alerts by Web Push (ADR-0027): the installed admin app on a phone or a desktop
 * browser gets a system notification. A topic is one kind of alert; each staff member
 * picks theirs, among those their permissions allow.
 */
export const PUSH_TOPICS = [
  "order_paid",
  "registration_free",
  "order_attention",
  "event_seats",
  "lead_new",
] as const;
export const pushTopicSchema = z.enum(PUSH_TOPICS);
export type PushTopic = z.infer<typeof pushTopicSchema>;

/** Who may receive a topic: the permission that lets them open what it points to. */
export const PUSH_TOPIC_PERMISSIONS: Readonly<Record<PushTopic, Permission>> = {
  order_paid: "order:read",
  registration_free: "order:read",
  order_attention: "order:read",
  event_seats: "program:read",
  lead_new: "lead:read",
};

/** Base64url without padding, as browsers give the subscription keys. */
const base64Url = (min: number, max: number) =>
  z
    .string()
    .min(min)
    .max(max)
    .regex(/^[A-Za-z0-9_-]+$/);

/**
 * A browser's push subscription (`PushSubscription.toJSON()`). The endpoint is an HTTPS
 * URL of the browser vendor's push service; it is a capability, never shown or logged.
 */
export const pushSubscriptionRequestSchema = z.object({
  endpoint: z
    .url()
    .max(2048)
    .refine((value) => value.startsWith("https://"), { message: "Expected an https URL" }),
  keys: z.object({
    p256dh: base64Url(80, 120),
    auth: base64Url(16, 32),
  }),
  /** "iPhone · Safari", shown in the device list; derived from the user agent. */
  deviceLabel: z.string().trim().max(60).default(""),
});
export type PushSubscriptionRequest = z.infer<typeof pushSubscriptionRequestSchema>;

export const pushUnsubscribeRequestSchema = pushSubscriptionRequestSchema.pick({
  endpoint: true,
});
export type PushUnsubscribeRequest = z.infer<typeof pushUnsubscribeRequestSchema>;

export const pushTopicsUpdateRequestSchema = z.object({
  topics: z.array(pushTopicSchema).max(PUSH_TOPICS.length),
});
export type PushTopicsUpdateRequest = z.infer<typeof pushTopicsUpdateRequestSchema>;

/** The signed-in staff member's alert settings. */
export const pushSettingsSchema = z.object({
  /** False when the server has no VAPID keys: the screen explains, nothing is sent. */
  available: z.boolean(),
  /** Application server key for `pushManager.subscribe` (public by design). */
  vapidPublicKey: z.string().nullable(),
  /** Topics this person may receive (from their permissions). */
  allowedTopics: z.array(pushTopicSchema),
  /** Topics they receive; all allowed ones until they choose. */
  topics: z.array(pushTopicSchema),
  /** Devices currently subscribed, newest first. */
  devices: z.array(
    z.object({
      deviceLabel: z.string(),
      createdAt: isoDateTimeSchema,
    }),
  ),
});
export type PushSettings = z.infer<typeof pushSettingsSchema>;

export const pushTestResponseSchema = z.object({ sent: z.number().int().min(0) });
export type PushTestResponse = z.infer<typeof pushTestResponseSchema>;

/**
 * Sent by a service's outbox (program-service, later lead-service) to alert staff.
 * Titles and bodies carry no personal data (CLAUDE §11): event titles, counts and
 * order codes only, never a buyer's name, email or phone.
 */
export const pushNotificationRequestSchema = z.object({
  /** Idempotency: a retried outbox job never alerts twice. */
  notificationId: z.uuid(),
  topic: pushTopicSchema,
  title: z.string().min(1).max(80),
  body: z.string().max(200),
  /** Admin path opened on tap; same-origin only. */
  url: z
    .string()
    .max(300)
    .regex(/^\/(?!\/)[^\\\s]*$/),
  /** Same tag replaces the previous notification instead of stacking. */
  tag: z.string().max(64).optional(),
});
export type PushNotificationRequest = z.infer<typeof pushNotificationRequestSchema>;

export const pushNotificationResponseSchema = z.object({
  /** Devices reached; 0 when nobody wants this topic or it was a duplicate. */
  sent: z.number().int().min(0),
  duplicate: z.boolean(),
});
export type PushNotificationResponse = z.infer<typeof pushNotificationResponseSchema>;
