import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

export const AUDIT_EVENT_MODEL = "AuditEvent";

/**
 * `audit_events` (docs/03 §4.4): append-only. The application's DB account has only
 * `find` + `insert` on this collection (docs/03 §10.3); no update/delete code exists.
 */
export const auditEventSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    at: { type: Date, required: true },
    service: { type: String, required: true },
    action: { type: String, required: true },
    actor: {
      type: new Schema(
        { userId: { type: String, default: null }, email: String, roles: [String] },
        { _id: false },
      ),
      default: null,
    },
    target: { type: new Schema({ type: String, id: String }, { _id: false }), default: null },
    result: { type: String, enum: ["success", "failure"], required: true },
    context: {
      type: new Schema({ requestId: String }, { _id: false }),
      default: null,
    },
    meta: { type: Schema.Types.Mixed, default: {} },
    /** `<service>:<eventId>` of an event sent by another service (ADR-0021); absent otherwise. */
    sourceEventId: { type: String },
  },
  { collection: "audit_events", timestamps: false, minimize: false },
);

auditEventSchema.index({ at: -1 }, { name: "idx_audit_events_at" });
auditEventSchema.index({ "actor.userId": 1, at: -1 }, { name: "idx_audit_events_actor_at" });
auditEventSchema.index({ action: 1, at: -1 }, { name: "idx_audit_events_action_at" });
auditEventSchema.index(
  { "target.type": 1, "target.id": 1, at: -1 },
  { name: "idx_audit_events_target_at" },
);

auditEventSchema.index(
  { sourceEventId: 1 },
  {
    name: "idx_audit_events_source_event_id_uq",
    unique: true,
    partialFilterExpression: { sourceEventId: { $type: "string" } },
  },
);

/** Registers the model; imported by the module file so only infrastructure touches Mongoose (S1). */
export const auditPersistence = MongooseModule.forFeature([
  { name: AUDIT_EVENT_MODEL, schema: auditEventSchema },
]);
