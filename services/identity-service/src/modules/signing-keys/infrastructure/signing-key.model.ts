import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

export const SIGNING_KEY_MODEL = "SigningKey";

/**
 * `signing_keys` (docs/03 §4.5): metadata and PUBLIC half of each signing key, kept
 * so tokens can be traced to a key after it left the configuration. No private key here.
 */
export const signingKeySchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    kid: { type: String, required: true },
    alg: { type: String, required: true },
    publicJwk: { type: Schema.Types.Mixed, required: true },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
  },
  { collection: "signing_keys", timestamps: true },
);

signingKeySchema.index({ kid: 1 }, { name: "idx_signing_keys_kid_uq", unique: true });

/** Registers the model; imported by the module file so only infrastructure touches Mongoose (S1). */
export const signingKeyPersistence = MongooseModule.forFeature([
  { name: SIGNING_KEY_MODEL, schema: signingKeySchema },
]);
