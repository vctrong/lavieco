import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type FilterQuery, type Model, Types, mongo } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import type { OrderListQuery } from "@lavieco/shared/events";

import {
  VerificationUsedError,
  type NewOrder,
  type OrderChanges,
  type OrderGuard,
  type OrderRepository,
} from "../application/ports/order-repositories.port";
import type { OrderRecord, PaymentLink } from "../domain/order";
import { ORDER_MODEL } from "./order.models";

type OrderDoc = Omit<OrderRecord, "id" | "eventId" | "items"> & {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  items: (Omit<OrderRecord["items"][number], "ticketTypeId"> & {
    ticketTypeId: Types.ObjectId;
  })[];
};

function toRecord(doc: OrderDoc): OrderRecord {
  return {
    id: doc._id.toHexString(),
    orderCode: doc.orderCode,
    eventId: doc.eventId.toHexString(),
    userId: doc.userId ?? null,
    verificationId: doc.verificationId,
    buyer: {
      fullName: doc.buyer.fullName,
      email: doc.buyer.email,
      emailNormalized: doc.buyer.emailNormalized,
      phone: doc.buyer.phone,
      phoneNormalized: doc.buyer.phoneNormalized,
    },
    items: doc.items.map((item) => ({
      ticketTypeId: item.ticketTypeId.toHexString(),
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
    amount: doc.amount,
    status: doc.status,
    seatState: doc.seatState,
    expiresAt: doc.expiresAt,
    paidAt: doc.paidAt ?? null,
    cancelledAt: doc.cancelledAt ?? null,
    expiredAt: doc.expiredAt ?? null,
    refundedAt: doc.refundedAt ?? null,
    refundNote: doc.refundNote ?? "",
    note: doc.note ?? "",
    consent: { version: doc.consent.version, at: doc.consent.at },
    safetyAcknowledgedAt: doc.safetyAcknowledgedAt ?? null,
    flags: {
      refundRequired: doc.flags?.refundRequired ?? false,
      amountMismatch: doc.flags?.amountMismatch ?? false,
      latePayment: doc.flags?.latePayment ?? false,
    },
    payment: doc.payment?.paymentLinkId
      ? {
          paymentLinkId: doc.payment.paymentLinkId,
          checkoutUrl: doc.payment.checkoutUrl,
          qrCode: doc.payment.qrCode,
          bin: doc.payment.bin,
          accountNumber: doc.payment.accountNumber,
          accountName: doc.payment.accountName,
          description: doc.payment.description,
          expiresAt: doc.payment.expiresAt,
        }
      : null,
    lastReconciledAt: doc.lastReconciledAt ?? null,
    revision: doc.revision,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Opaque cursor over (`createdAt` desc, `_id` desc). */
const encodeCursor = (doc: { createdAt: Date; _id: Types.ObjectId }) =>
  Buffer.from(`${doc.createdAt.toISOString()}|${doc._id.toHexString()}`).toString("base64url");

function decodeCursor(cursor: string): { createdAt: Date; id: Types.ObjectId } | null {
  const [at, id] = Buffer.from(cursor, "base64url").toString().split("|");
  if (!at || !id || !Types.ObjectId.isValid(id) || Number.isNaN(Date.parse(at))) return null;
  return { createdAt: new Date(at), id: new Types.ObjectId(id) };
}

function isDuplicateKey(error: unknown, index: string): boolean {
  return (
    error instanceof mongo.MongoServerError && error.code === 11000 && error.message.includes(index)
  );
}

@Injectable()
export class MongoOrderRepository implements OrderRepository {
  constructor(@InjectModel(ORDER_MODEL) private readonly model: Model<OrderDoc>) {}

  newId() {
    return new Types.ObjectId().toHexString();
  }

  async insert(order: NewOrder, tx: TxContext) {
    try {
      const [doc] = await this.model.create(
        [
          {
            ...order,
            _id: new Types.ObjectId(order.id),
            eventId: new Types.ObjectId(order.eventId),
            items: order.items.map((item) => ({
              ...item,
              ticketTypeId: new Types.ObjectId(item.ticketTypeId),
            })),
            revision: 1,
            schemaVersion: 1,
          },
        ],
        { session: sessionOf(tx) },
      );
      return toRecord(doc!.toObject<OrderDoc>());
    } catch (error) {
      if (isDuplicateKey(error, "idx_orders_verification_id_uq")) throw new VerificationUsedError();
      throw error;
    }
  }

  async findById(id: string, tx?: TxContext) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findById(id)
      .session(sessionOf(tx) ?? null)
      .lean<OrderDoc>()
      .exec();
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

  async transition(id: string, guard: OrderGuard, changes: OrderChanges, tx?: TxContext) {
    const filter: FilterQuery<OrderDoc> = {
      _id: new Types.ObjectId(id),
      status: { $in: [...guard.statuses] },
    };
    if (guard.seatState) filter.seatState = guard.seatState;
    if (guard.expiresBefore) filter.expiresAt = { $lte: guard.expiresBefore };
    if (guard.revision !== undefined) filter.revision = guard.revision;
    const { flags, ...rest } = changes;
    const set: Record<string, unknown> = { ...rest };
    for (const [key, value] of Object.entries(flags ?? {})) set[`flags.${key}`] = value;
    const doc = await this.model
      .findOneAndUpdate(
        filter,
        { $set: set, $inc: { revision: 1 } },
        { new: true, session: sessionOf(tx) },
      )
      .lean<OrderDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async setPayment(id: string, payment: PaymentLink) {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id) },
        { $set: { payment }, $inc: { revision: 1 } },
        { new: true },
      )
      .lean<OrderDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async listExpired(now: Date, limit: number) {
    const docs = await this.model
      .find({ status: "pending", expiresAt: { $lte: now } }, { _id: 1 })
      .sort({ expiresAt: 1 })
      .limit(limit)
      .lean<{ _id: Types.ObjectId }[]>()
      .exec();
    return docs.map((doc) => doc._id.toHexString());
  }

  async listByEmail(emailNormalized: string, limit: number) {
    const docs = await this.model
      .find({ "buyer.emailNormalized": emailNormalized, status: { $in: ["paid", "refunded"] } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<OrderDoc[]>()
      .exec();
    return docs.map(toRecord);
  }

  async listAdmin(query: OrderListQuery) {
    const filter: FilterQuery<OrderDoc> = {};
    if (query.eventId) filter.eventId = new Types.ObjectId(query.eventId);
    if (query.status) filter.status = query.status;
    if (query.flag === "refund_required") filter["flags.refundRequired"] = true;
    if (query.flag === "amount_mismatch") filter["flags.amountMismatch"] = true;
    if (query.q) Object.assign(filter, searchFilter(query.q));
    return this.page(filter, query.cursor, query.limit);
  }

  async listForRegistrations(
    eventId: string,
    options: { includeRefunded: boolean; q?: string; cursor?: string; limit: number },
  ) {
    const filter: FilterQuery<OrderDoc> = {
      eventId: new Types.ObjectId(eventId),
      status: { $in: options.includeRefunded ? ["paid", "refunded"] : ["paid"] },
    };
    if (options.q) Object.assign(filter, searchFilter(options.q));
    return this.page(filter, options.cursor, options.limit);
  }

  private async page(filter: FilterQuery<OrderDoc>, cursor: string | undefined, limit: number) {
    const after = cursor ? decodeCursor(cursor) : null;
    const scoped: FilterQuery<OrderDoc> = after
      ? {
          $and: [
            filter,
            {
              $or: [
                { createdAt: { $lt: after.createdAt } },
                { createdAt: after.createdAt, _id: { $lt: after.id } },
              ],
            },
          ],
        }
      : filter;
    const docs = await this.model
      .find(scoped)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean<OrderDoc[]>()
      .exec();
    const items = docs.slice(0, limit);
    const last = items.at(-1);
    return {
      items: items.map(toRecord),
      nextCursor: docs.length > limit && last ? encodeCursor(last) : null,
    };
  }
}

/** Order code (digits only) or part of the booker's name, email or phone (admin search). */
function searchFilter(q: string): FilterQuery<OrderDoc> {
  if (/^\d{6,12}$/.test(q)) return { orderCode: Number(q) };
  const pattern = new RegExp(escapeRegex(q), "i");
  return {
    $or: [
      { "buyer.fullName": pattern },
      { "buyer.emailNormalized": pattern },
      { "buyer.phone": pattern },
    ],
  };
}
