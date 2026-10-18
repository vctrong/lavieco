import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

import { EVENT_FORMATS, EVENT_KINDS, EVENT_STATUSES, QUESTION_TYPES } from "@lavieco/shared/events";

export const EVENT_MODEL = "Event";
export const PREVIEW_TOKEN_MODEL = "PreviewToken";

const actorSchema = new Schema({ userId: { type: String, required: true } }, { _id: false });

/** Snapshot of a content-service media (ADR-0020): enough to render, no call needed. */
const imageSchema = new Schema(
  {
    mediaId: { type: String, required: true },
    publicId: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    alt: { type: String, required: true },
  },
  { _id: false },
);

const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    label: { type: String, required: true },
    description: { type: String, default: "" },
    required: { type: Boolean, default: false },
    options: { type: [{ id: String, label: String, _id: false }], default: [] },
    hidden: { type: Boolean, default: false },
  },
  { _id: false },
);

/**
 * `events` (docs/03 §9.2). Embedded arrays are capped by the shared Zod contract
 * (EVENT_LIMITS); `statusHistory` is trimmed to the last 100 entries on write.
 */
export const eventSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    kind: { type: String, enum: EVENT_KINDS, required: true },
    slug: { type: String, required: true },
    status: { type: String, enum: EVENT_STATUSES, required: true },
    title: { type: String, required: true },
    /** Accent-free title for the admin search (docs/03 §1.2). */
    searchKey: { type: String, required: true },
    typeId: { type: Schema.Types.ObjectId, required: true },
    format: { type: String, enum: EVENT_FORMATS, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    venue: {
      type: new Schema(
        { name: String, address: String, mapUrl: { type: String, default: null } },
        { _id: false },
      ),
      default: null,
    },
    onlineUrl: { type: String, default: null },
    summary: { type: String, default: "" },
    description: { type: String, default: "" },
    safetyNotes: { type: String, default: "" },
    cancellationPolicy: { type: String, default: "" },
    forChildren: { type: Boolean, default: false },
    speakers: { type: [{ name: String, role: String, _id: false }], default: [] },
    agenda: { type: [{ time: String, title: String, _id: false }], default: [] },
    faq: { type: [{ question: String, answer: String, _id: false }], default: [] },
    cover: { type: imageSchema, default: null },
    /** ≤ MEDIA_LIMITS.eventGalleryMax (12), enforced by the shared contract. */
    gallery: { type: [imageSchema], default: [] },
    form: {
      questions: { type: [questionSchema], default: [] },
    },
    pricing: {
      isFree: { type: Boolean, default: false },
      priceFrom: { type: Number, default: null },
    },
    publishedAt: { type: Date, default: null },
    firstPublishedAt: { type: Date, default: null },
    statusHistory: {
      type: [
        {
          from: String,
          to: String,
          at: Date,
          by: String,
          _id: false,
        },
      ],
      default: [],
    },
    /** Never-published draft thrown away; kept for traceability, frees its slug. */
    discarded: { type: Boolean, default: false },
    discardedAt: { type: Date, default: null },
    revision: { type: Number, required: true, default: 1 },
    createdBy: { type: actorSchema, required: true },
    updatedBy: { type: actorSchema, required: true },
  },
  { collection: "events", timestamps: true },
);

eventSchema.index(
  { slug: 1 },
  { name: "idx_events_slug_uq", unique: true, partialFilterExpression: { discarded: false } },
);
eventSchema.index({ status: 1, startAt: -1 }, { name: "idx_events_status_start_at" });
eventSchema.index({ typeId: 1, status: 1 }, { name: "idx_events_type_id_status" });

/** `preview_tokens`: hash only, removed by TTL once expired. */
export const previewTokenSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    tokenHash: { type: String, required: true },
    eventId: { type: Schema.Types.ObjectId, required: true },
    createdBy: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: "preview_tokens", timestamps: true },
);

previewTokenSchema.index(
  { tokenHash: 1 },
  { name: "idx_preview_tokens_token_hash_uq", unique: true },
);
previewTokenSchema.index(
  { expiresAt: 1 },
  { name: "idx_preview_tokens_expires_at", expireAfterSeconds: 0 },
);

export const eventPersistence = MongooseModule.forFeature([
  { name: EVENT_MODEL, schema: eventSchema },
  { name: PREVIEW_TOKEN_MODEL, schema: previewTokenSchema },
]);
