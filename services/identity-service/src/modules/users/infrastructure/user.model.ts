import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

import { USER_STATUSES, USER_TYPES } from "@lavieco/shared/identity";
import { ROLES } from "@lavieco/shared/permissions";

export const USER_MODEL = "User";

/** `users` (docs/03 §4.1). Indexes are created by migrations; declared here for documentation. */
export const userSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    type: { type: String, enum: USER_TYPES, required: true },
    email: { type: String, required: true },
    emailNormalized: { type: String, required: true },
    displayName: { type: String, required: true },
    roles: { type: [{ type: String, enum: ROLES }], default: [] },
    status: { type: String, enum: USER_STATUSES, required: true },
    passwordHash: { type: String, default: null },
    mfa: {
      totp: {
        type: new Schema(
          {
            secretEnc: { type: String, required: true },
            enabledAt: { type: Date, required: true },
            lastUsedStep: { type: Number, default: null },
          },
          { _id: false },
        ),
        default: null,
      },
      recoveryCodes: {
        type: [new Schema({ hash: String, usedAt: { type: Date, default: null } }, { _id: false })],
        default: [],
      },
    },
    googleSub: { type: String },
    emailVerifiedAt: { type: Date, default: null },
    consent: {
      type: new Schema({ version: String, at: Date }, { _id: false }),
      default: null,
    },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    createdBy: { type: String, default: null },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "users", timestamps: true },
);

userSchema.index({ emailNormalized: 1 }, { name: "idx_users_email_normalized_uq", unique: true });
userSchema.index({ status: 1 }, { name: "idx_users_status" });
userSchema.index(
  { googleSub: 1 },
  {
    name: "idx_users_google_sub_uq",
    unique: true,
    partialFilterExpression: { googleSub: { $type: "string" } },
  },
);

/** Registers the model; imported by the module file so only infrastructure touches Mongoose (S1). */
export const userPersistence = MongooseModule.forFeature([
  { name: USER_MODEL, schema: userSchema },
]);
