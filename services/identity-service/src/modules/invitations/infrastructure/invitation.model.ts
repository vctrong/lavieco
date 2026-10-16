import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

import { ROLES } from "@lavieco/shared/permissions";

export const INVITATION_MODEL = "Invitation";

/** `invitations` (docs/03 §4.3): only the hash of the link token is stored. */
export const invitationSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    userId: { type: String, required: true },
    email: { type: String, required: true },
    emailNormalized: { type: String, required: true },
    roles: { type: [{ type: String, enum: ROLES }], default: [] },
    tokenHash: { type: String, required: true },
    invitedBy: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    pendingTotpSecretEnc: { type: String, default: null },
    purgeAt: { type: Date, required: true },
  },
  { collection: "invitations", timestamps: true },
);

invitationSchema.index({ tokenHash: 1 }, { name: "idx_invitations_token_hash_uq", unique: true });
invitationSchema.index({ emailNormalized: 1 }, { name: "idx_invitations_email_normalized" });
invitationSchema.index({ purgeAt: 1 }, { name: "idx_invitations_purge_at", expireAfterSeconds: 0 });

/** Registers the model; imported by the module file so only infrastructure touches Mongoose (S1). */
export const invitationPersistence = MongooseModule.forFeature([
  { name: INVITATION_MODEL, schema: invitationSchema },
]);
