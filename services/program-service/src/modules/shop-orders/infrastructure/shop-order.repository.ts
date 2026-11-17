import { Injectable } from "@nestjs/common";
import { InjectModel, MongooseModule } from "@nestjs/mongoose";
import { type FilterQuery, type Model, Schema, Types } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import {
  SHOP_ORDER_STATUSES,
  type ShopOrderListQuery,
  type ShopOrderStatus,
} from "@lavieco/shared/shop";

import type { ShopOrderRepository } from "../application/ports";
import type { ShopOrderRecord } from "../domain/shop-order";

export const SHOP_ORDER_MODEL = "ShopOrder";

/**
 * `shop_orders` (docs/03 §9.3). `buyer` and `shipping` are the personal data, apart from
 * the financial fields, so the retention job can anonymise them alone (DQ8).
 */
export const shopOrderSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    schemaVersion: { type: Number, required: true, default: 1 },
    orderCode: { type: Number, required: true },
    publicCode: { type: String, required: true },
    userId: { type: String, default: null },
    verificationId: { type: String, required: true },
    buyer: { type: Schema.Types.Mixed, required: true },
    shipping: { type: Schema.Types.Mixed, required: true },
    items: { type: Schema.Types.Mixed, required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Schema.Types.Mixed, default: null },
    shippingFee: { type: Number, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    status: { type: String, enum: SHOP_ORDER_STATUSES, required: true },
    stockState: { type: String, required: true },
    expiresAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    tracking: { type: Schema.Types.Mixed, default: null },
    statusHistory: { type: Schema.Types.Mixed, default: [] },
    consent: { type: Schema.Types.Mixed, required: true },
    flags: { type: Schema.Types.Mixed, required: true },
    payment: { type: Schema.Types.Mixed, default: null },
    refundNote: { type: String, default: "" },
    anonymizedAt: { type: Date, default: null },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "shop_orders", timestamps: true, minimize: false },
);
shopOrderSchema.index({ orderCode: 1 }, { name: "idx_shop_orders_order_code_uq", unique: true });
shopOrderSchema.index({ publicCode: 1 }, { name: "idx_shop_orders_public_code_uq", unique: true });
shopOrderSchema.index(
  { verificationId: 1 },
  { name: "idx_shop_orders_verification_id_uq", unique: true },
);
shopOrderSchema.index({ status: 1, expiresAt: 1 }, { name: "idx_shop_orders_status_expires_at" });
shopOrderSchema.index(
  { "buyer.emailNormalized": 1, createdAt: -1 },
  { name: "idx_shop_orders_buyer_email_normalized_created_at" },
);
shopOrderSchema.index({ userId: 1, createdAt: -1 }, { name: "idx_shop_orders_user_id_created_at" });
shopOrderSchema.index({ status: 1, createdAt: -1 }, { name: "idx_shop_orders_status_created_at" });

export const shopOrderPersistence = MongooseModule.forFeature([
  { name: SHOP_ORDER_MODEL, schema: shopOrderSchema },
]);

type OrderDoc = Omit<ShopOrderRecord, "id"> & { _id: Types.ObjectId };

const toRecord = (doc: OrderDoc): ShopOrderRecord => {
  const { _id, ...rest } = doc;
  return {
    ...rest,
    id: _id.toHexString(),
    statusHistory: rest.statusHistory ?? [],
  } as ShopOrderRecord;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TODO: ShopOrderStatus[] = ["awaiting_confirmation", "paid", "confirmed", "packing"];
const PENDING: ShopOrderStatus[] = ["awaiting_payment", "awaiting_confirmation"];

const encodeOffset = (offset: number) => Buffer.from(`o:${offset}`).toString("base64url");
function decodeOffset(cursor?: string) {
  if (!cursor) return 0;
  const offset = Number(Buffer.from(cursor, "base64url").toString().split(":")[1]);
  return Number.isInteger(offset) && offset >= 0 ? offset : 0;
}

@Injectable()
export class MongoShopOrderRepository implements ShopOrderRepository {
  constructor(@InjectModel(SHOP_ORDER_MODEL) private readonly model: Model<OrderDoc>) {}

  newId() {
    return new Types.ObjectId().toHexString();
  }

  async insert(order: ShopOrderRecord, tx: TxContext) {
    const { id, createdAt: _c, updatedAt: _u, ...rest } = order;
    void _c;
    void _u;
    await this.model.create([{ ...rest, _id: new Types.ObjectId(id), schemaVersion: 1 }], {
      session: sessionOf(tx),
    });
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(new Types.ObjectId(id)).lean<OrderDoc>().exec();
    return doc ? toRecord(doc) : null;
  }

  async findByOrderCode(orderCode: number, tx?: TxContext) {
    const doc = await this.model
      .findOne({ orderCode })
      .session(sessionOf(tx) ?? null)
      .lean<OrderDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async findByVerificationId(verificationId: string) {
    const doc = await this.model.findOne({ verificationId }).lean<OrderDoc>().exec();
    return doc ? toRecord(doc) : null;
  }

  async transition(
    id: string,
    from: readonly ShopOrderStatus[],
    set: Partial<Omit<ShopOrderRecord, "id">>,
    entry: { status: ShopOrderStatus; at: Date; actorId: string | null },
    tx: TxContext,
    revision?: number,
  ) {
    const filter: FilterQuery<OrderDoc> = {
      _id: new Types.ObjectId(id),
      status: { $in: [...from] },
    };
    if (revision !== undefined) filter.revision = revision;
    const doc = await this.model
      .findOneAndUpdate(
        filter,
        {
          $set: set,
          $inc: { revision: 1 },
          // statusHistory is capped at 100 entries (docs/03 §1.2).
          $push: { statusHistory: { $each: [entry], $slice: -100 } },
        },
        { new: true, session: sessionOf(tx) },
      )
      .lean<OrderDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async setPayment(id: string, payment: ShopOrderRecord["payment"]) {
    await this.model.updateOne({ _id: new Types.ObjectId(id) }, { $set: { payment } }).exec();
  }

  async list(query: ShopOrderListQuery) {
    const filter: FilterQuery<OrderDoc> = {};
    if (query.status) filter.status = query.status;
    else if (query.view === "todo")
      filter.$or = [
        { status: { $in: TODO } },
        { "flags.refundRequired": true },
        { "flags.amountMismatch": true },
      ];
    if (query.q) {
      const q = query.q.trim();
      const regex = new RegExp(escapeRegex(q), "i");
      const number = Number(q);
      filter.$and = [
        {
          $or: [
            { publicCode: regex },
            { "buyer.emailNormalized": regex },
            { "buyer.phone": regex },
            { "buyer.fullName": regex },
            ...(Number.isInteger(number) ? [{ orderCode: number }] : []),
          ],
        },
      ];
    }
    const offset = decodeOffset(query.cursor);
    const docs = await this.model
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(offset)
      .limit(query.limit + 1)
      .lean<OrderDoc[]>()
      .exec();
    return {
      items: docs.slice(0, query.limit).map(toRecord),
      nextCursor: docs.length > query.limit ? encodeOffset(offset + query.limit) : null,
    };
  }

  async listByEmail(emailNormalized: string, limit: number) {
    const docs = await this.model
      .find({ "buyer.emailNormalized": emailNormalized })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<OrderDoc[]>()
      .exec();
    return docs.map(toRecord);
  }

  async listByUser(userId: string, limit: number) {
    const docs = await this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<OrderDoc[]>()
      .exec();
    return docs.map(toRecord);
  }

  countPendingByEmail(emailNormalized: string) {
    return this.model
      .countDocuments({ "buyer.emailNormalized": emailNormalized, status: { $in: PENDING } })
      .exec();
  }

  countPaidBy(emailNormalized: string, userId: string | null) {
    const who = userId
      ? [{ userId }, { "buyer.emailNormalized": emailNormalized }]
      : [{ "buyer.emailNormalized": emailNormalized }];
    return this.model
      .countDocuments({ $or: who, paidAt: { $ne: null }, status: { $ne: "refunded" } })
      .exec();
  }

  async dueForExpiry(now: Date, limit: number) {
    const docs = await this.model
      .find({ status: { $in: PENDING }, expiresAt: { $lte: now } })
      .limit(limit)
      .lean<OrderDoc[]>()
      .exec();
    return docs.map(toRecord);
  }

  async revenueSince(from: Date) {
    const [row] = await this.model
      .aggregate<{ total: number }>([
        { $match: { paidAt: { $gte: from }, status: { $nin: ["refunded", "cancelled"] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ])
      .exec();
    return row?.total ?? 0;
  }

  countByStatus(statuses: readonly ShopOrderStatus[]) {
    return this.model.countDocuments({ status: { $in: [...statuses] } }).exec();
  }

  countFlagged() {
    return this.model
      .countDocuments({ $or: [{ "flags.refundRequired": true }, { "flags.amountMismatch": true }] })
      .exec();
  }

  async claimForUser(emailNormalized: string, userId: string) {
    await this.model
      .updateMany({ "buyer.emailNormalized": emailNormalized, userId: null }, { $set: { userId } })
      .exec();
  }

  async listForExport(from: Date, to: Date) {
    const docs = await this.model
      .find({ createdAt: { $gte: from, $lte: to } })
      .sort({ createdAt: 1 })
      .limit(10_000)
      .lean<OrderDoc[]>()
      .exec();
    return docs.map(toRecord);
  }
}
