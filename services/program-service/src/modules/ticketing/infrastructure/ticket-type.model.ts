import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

export const TICKET_TYPE_MODEL = "TicketType";

/**
 * `ticket_types` (docs/03 §9.2). Prices are whole VND. `sold`/`held` only change
 * through atomic `$inc` with orders (Phase 3); admin edits never write them.
 */
export const ticketTypeSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    eventId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: null },
    saleStartAt: { type: Date, default: null },
    saleEndAt: { type: Date, default: null },
    maxPerOrder: { type: Number, required: true },
    sortOrder: { type: Number, default: 0 },
    hidden: { type: Boolean, default: false },
    sold: { type: Number, required: true, default: 0 },
    held: { type: Number, required: true, default: 0 },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "ticket_types", timestamps: true },
);

ticketTypeSchema.index(
  { eventId: 1, sortOrder: 1 },
  { name: "idx_ticket_types_event_id_sort_order" },
);

export const ticketTypePersistence = MongooseModule.forFeature([
  { name: TICKET_TYPE_MODEL, schema: ticketTypeSchema },
]);
