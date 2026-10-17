import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

import { OTP_PURPOSES } from "@lavieco/shared/identity";

import { RATE_LIMIT_BUCKET_MODEL, rateLimitBucketSchema } from "./rate-limit-bucket.model";

export const OTP_CODE_MODEL = "OtpCode";

/** How long a finished challenge is kept (for troubleshooting) before the TTL index removes it. */
export const OTP_PURGE_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * `otp_codes` (docs/05 §4): the code itself is never stored, only an HMAC; no IP is
 * stored either (rate limits use keyed hashes in `rate_limit_buckets`).
 */
export const otpCodeSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    challengeId: { type: String, required: true },
    emailNormalized: { type: String, required: true },
    purpose: { type: String, enum: OTP_PURPOSES, required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, required: true, default: 0 },
    verifiedAt: { type: Date, default: null },
    consumedAt: { type: Date, default: null },
    purgeAt: { type: Date, required: true },
  },
  { collection: "otp_codes", timestamps: true },
);

otpCodeSchema.index({ challengeId: 1 }, { name: "idx_otp_codes_challenge_id_uq", unique: true });
otpCodeSchema.index({ purgeAt: 1 }, { name: "idx_otp_codes_purge_at", expireAfterSeconds: 0 });

/** Registers the OTP models; imported by the module file so only infrastructure touches Mongoose (S1). */
export const otpPersistence = MongooseModule.forFeature([
  { name: OTP_CODE_MODEL, schema: otpCodeSchema },
  { name: RATE_LIMIT_BUCKET_MODEL, schema: rateLimitBucketSchema },
]);
