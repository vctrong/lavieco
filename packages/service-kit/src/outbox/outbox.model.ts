import { Schema } from "mongoose";

export const OUTBOX_MODEL = "Outbox";

export const OUTBOX_STATUSES = ["pending", "processing", "done", "dead"] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

/** How long finished jobs stay for troubleshooting before the TTL index removes them. */
export const OUTBOX_RETENTION_DAYS = 7;

/**
 * `outbox` collection, identical in every service (docs/03 §7.3). Indexes are created
 * by each service's migration: `idx_outbox_status_available_at` and the TTL `idx_outbox_purge_at`.
 */
export const outboxSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: OUTBOX_STATUSES, required: true, default: "pending" },
    attempts: { type: Number, required: true, default: 0 },
    availableAt: { type: Date, required: true },
    lockedUntil: { type: Date, default: null },
    lastErrorCode: { type: String, default: null },
    purgeAt: { type: Date, default: null },
  },
  { collection: "outbox", timestamps: true, minimize: false },
);

outboxSchema.index({ status: 1, availableAt: 1 }, { name: "idx_outbox_status_available_at" });
outboxSchema.index({ purgeAt: 1 }, { name: "idx_outbox_purge_at", expireAfterSeconds: 0 });
