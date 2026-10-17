import { Schema } from "mongoose";

export const RATE_LIMIT_BUCKET_MODEL = "RateLimitBucket";

/**
 * `rate_limit_buckets`: fixed-window counters kept in MongoDB because Redis is not
 * part of stage 1 (docs/02 §14.1). `key` is an HMAC, never a raw email or IP.
 */
export const rateLimitBucketSchema = new Schema(
  {
    key: { type: String, required: true },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: "rate_limit_buckets", versionKey: false },
);

rateLimitBucketSchema.index({ key: 1 }, { name: "idx_rate_limit_buckets_key_uq", unique: true });
rateLimitBucketSchema.index(
  { expiresAt: 1 },
  { name: "idx_rate_limit_buckets_expires_at", expireAfterSeconds: 0 },
);
