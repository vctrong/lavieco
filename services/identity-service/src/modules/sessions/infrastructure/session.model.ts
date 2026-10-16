import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

import { USER_TYPES } from "@lavieco/shared/identity";

export const SESSION_MODEL = "Session";

/** `sessions` (docs/03 §4.2): one document per refresh token, only its hash is stored. */
export const sessionSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    userId: { type: String, required: true },
    userType: { type: String, enum: USER_TYPES, required: true },
    familyId: { type: String, required: true },
    tokenHash: { type: String, required: true },
    lastUsedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
    rotatedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null },
  },
  { collection: "sessions", timestamps: true },
);

sessionSchema.index({ tokenHash: 1 }, { name: "idx_sessions_token_hash_uq", unique: true });
sessionSchema.index({ userId: 1, revokedAt: 1 }, { name: "idx_sessions_user_id_revoked_at" });
sessionSchema.index({ familyId: 1 }, { name: "idx_sessions_family_id" });
sessionSchema.index({ expiresAt: 1 }, { name: "idx_sessions_expires_at", expireAfterSeconds: 0 });

/** Registers the model; imported by the module file so only infrastructure touches Mongoose (S1). */
export const sessionPersistence = MongooseModule.forFeature([
  { name: SESSION_MODEL, schema: sessionSchema },
]);
