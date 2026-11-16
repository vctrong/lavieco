import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

import { PUSH_TOPICS } from "@lavieco/shared/identity";

export const PUSH_SUBSCRIPTION_MODEL = "PushSubscription";
export const PUSH_PREFERENCE_MODEL = "PushPreference";
export const PUSH_DELIVERY_MODEL = "PushDelivery";

/** How long a handled notification id is remembered against outbox retries. */
export const PUSH_DELIVERY_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * `push_subscriptions` (docs/03 §4.1, ADR-0027): one browser of one staff member. The
 * endpoint is a capability URL of the browser's push service: never logged. `endpointHash`
 * (SHA-256) carries the unique index, the raw URL can exceed an index key's size.
 */
export const pushSubscriptionSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    userId: { type: String, required: true },
    endpoint: { type: String, required: true },
    endpointHash: { type: String, required: true },
    keys: {
      type: new Schema(
        {
          p256dh: { type: String, required: true },
          auth: { type: String, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    deviceLabel: { type: String, default: "" },
    lastDeliveredAt: { type: Date, default: null },
  },
  { collection: "push_subscriptions", timestamps: true },
);

pushSubscriptionSchema.index(
  { endpointHash: 1 },
  { name: "idx_push_subscriptions_endpoint_hash_uq", unique: true },
);
pushSubscriptionSchema.index(
  { userId: 1, createdAt: -1 },
  { name: "idx_push_subscriptions_user_id_created_at" },
);

/** `push_preferences`: the topics a staff member chose; absent = every allowed topic. */
export const pushPreferenceSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    userId: { type: String, required: true },
    // Bounded by the topic list (CLAUDE §10: every embedded array has a cap).
    topics: { type: [{ type: String, enum: PUSH_TOPICS }], default: [] },
  },
  { collection: "push_preferences", timestamps: true },
);

pushPreferenceSchema.index(
  { userId: 1 },
  { name: "idx_push_preferences_user_id_uq", unique: true },
);

/** `push_deliveries`: notification ids already fanned out, removed by TTL after 7 days. */
export const pushDeliverySchema = new Schema(
  {
    notificationId: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { collection: "push_deliveries", versionKey: false },
);

pushDeliverySchema.index(
  { notificationId: 1 },
  { name: "idx_push_deliveries_notification_id_uq", unique: true },
);
pushDeliverySchema.index(
  { createdAt: 1 },
  { name: "idx_push_deliveries_created_at", expireAfterSeconds: PUSH_DELIVERY_TTL_SECONDS },
);

/** Imported by the module file so only infrastructure touches Mongoose (S1). */
export const pushPersistence = MongooseModule.forFeature([
  { name: PUSH_SUBSCRIPTION_MODEL, schema: pushSubscriptionSchema },
  { name: PUSH_PREFERENCE_MODEL, schema: pushPreferenceSchema },
  { name: PUSH_DELIVERY_MODEL, schema: pushDeliverySchema },
]);
