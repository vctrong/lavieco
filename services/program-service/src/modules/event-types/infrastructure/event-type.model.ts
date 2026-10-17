import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

export const EVENT_TYPE_MODEL = "EventType";

/** `event_types` (docs/03 §9.2). Never deleted: archived types keep old events readable. */
export const eventTypeSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    key: { type: String, required: true },
    name: {
      vi: { type: String, required: true },
      en: { type: String },
    },
    sortOrder: { type: Number, required: true, default: 100 },
    archivedAt: { type: Date, default: null },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "event_types", timestamps: true },
);

eventTypeSchema.index({ key: 1 }, { name: "idx_event_types_key_uq", unique: true });
eventTypeSchema.index({ sortOrder: 1 }, { name: "idx_event_types_sort_order" });

export const eventTypePersistence = MongooseModule.forFeature([
  { name: EVENT_TYPE_MODEL, schema: eventTypeSchema },
]);
