import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

import { MEDIA_FORMATS, MEDIA_PURPOSES } from "@lavieco/shared/media";

export const MEDIA_MODEL = "Media";

const actorSchema = new Schema(
  {
    kind: { type: String, required: true, enum: ["staff", "member"] },
    userId: { type: String, required: true },
  },
  { _id: false },
);

/**
 * `media` (docs/03 §5.8, ADR-0020): metadata only, the file is on Cloudinary.
 * `live` mirrors `status === "attached"` so the partial unique index on avatars
 * filters on equality (partial indexes cannot use $ne, docs/03 §10.2).
 */
export const mediaSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    kind: { type: String, required: true, default: "image" },
    purpose: { type: String, required: true, enum: MEDIA_PURPOSES },
    status: { type: String, required: true, enum: ["pending", "attached", "deleted"] },
    live: { type: Boolean, required: true },
    publicId: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    bytes: { type: Number, required: true },
    format: { type: String, required: true, enum: MEDIA_FORMATS },
    sha256: { type: String, required: true },
    exifStripped: { type: Boolean, required: true, default: true },
    owner: {
      type: new Schema(
        {
          kind: { type: String, required: true, enum: ["member"] },
          userId: { type: String, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    attachedTo: {
      type: new Schema(
        {
          service: { type: String, required: true },
          kind: { type: String, required: true },
          id: { type: String, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    uploadedBy: { type: actorSchema, required: true },
    deletedAt: { type: Date, default: null },
    storageDeletedAt: { type: Date, default: null },
    eraseAfterDestroy: { type: Boolean, required: true, default: false },
  },
  { collection: "media", timestamps: true },
);

mediaSchema.index({ status: 1, createdAt: 1 }, { name: "idx_media_status_created_at" });
mediaSchema.index(
  { "owner.userId": 1 },
  {
    name: "idx_media_owner_avatar_uq",
    unique: true,
    partialFilterExpression: { purpose: "avatar", live: true },
  },
);
mediaSchema.index({ "attachedTo.id": 1 }, { name: "idx_media_attached_to" });

export const mediaPersistence = MongooseModule.forFeature([
  { name: MEDIA_MODEL, schema: mediaSchema },
]);
