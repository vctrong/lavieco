import type { PushTopic } from "@lavieco/shared/identity";

export const PUSH_SUBSCRIPTION_REPOSITORY = Symbol("PUSH_SUBSCRIPTION_REPOSITORY");
export const PUSH_PREFERENCE_REPOSITORY = Symbol("PUSH_PREFERENCE_REPOSITORY");
export const PUSH_DELIVERY_LOG = Symbol("PUSH_DELIVERY_LOG");
export const PUSH_SENDER = Symbol("PUSH_SENDER");

/** One browser on one device, able to receive pushes for one staff member. */
export type PushSubscriptionRecord = {
  id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  deviceLabel: string;
  createdAt: Date;
};

export interface PushSubscriptionRepository {
  /**
   * Inserts, or moves an existing endpoint to `userId` (another person signed in on that
   * browser). Keeps at most `maxPerUser` per person by dropping their oldest.
   */
  upsert(
    input: Omit<PushSubscriptionRecord, "id" | "createdAt">,
    maxPerUser: number,
    now: Date,
  ): Promise<void>;
  /** Only the owner's: an endpoint of someone else is left alone. */
  deleteForUser(userId: string, endpoint: string): Promise<void>;
  /** Push service said the subscription is gone (404/410). */
  deleteById(id: string): Promise<void>;
  listByUsers(userIds: readonly string[]): Promise<PushSubscriptionRecord[]>;
  markDelivered(id: string, at: Date): Promise<void>;
}

export interface PushPreferenceRepository {
  /** `null` until the person chooses: every allowed topic is then on. */
  findTopics(userId: string): Promise<PushTopic[] | null>;
  findTopicsForUsers(userIds: readonly string[]): Promise<Map<string, PushTopic[]>>;
  setTopics(userId: string, topics: readonly PushTopic[], now: Date): Promise<void>;
}

export interface PushDeliveryLog {
  /** False when this notification id was already handled (outbox retry). */
  claim(notificationId: string, now: Date): Promise<boolean>;
}

export type PushMessage = { title: string; body: string; url: string; tag?: string };

export type PushSendResult = "sent" | "gone" | "failed";

export interface PushSender {
  /** False when no VAPID keys are configured: nothing can be sent. */
  readonly available: boolean;
  readonly publicKey: string | null;
  send(subscription: PushSubscriptionRecord, message: PushMessage): Promise<PushSendResult>;
}
