import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type FilterQuery, type Model, Types, mongo } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import type { VoucherListQuery, VoucherStatus } from "@lavieco/shared/events";

import {
  RedemptionTakenError,
  VoucherCodeTakenError,
  type RateLimiter,
  type RedemptionRecord,
  type RedemptionState,
  type VoucherRedemptionRepository,
  type VoucherRepository,
} from "../application/ports/voucher-repository.port";
import type { VoucherChanges, VoucherRecord } from "../domain/voucher";
import { RATE_LIMIT_BUCKET_MODEL, VOUCHER_MODEL, VOUCHER_REDEMPTION_MODEL } from "./voucher.models";

type VoucherDoc = Omit<VoucherRecord, "id" | "eventId"> & {
  _id: Types.ObjectId;
  eventId: Types.ObjectId | null;
};

const oid = (id: string) => new Types.ObjectId(id);

function toRecord(doc: VoucherDoc): VoucherRecord {
  return {
    id: doc._id.toHexString(),
    code: doc.code,
    name: doc.name,
    description: doc.description ?? "",
    status: doc.status,
    scope: doc.scope,
    eventId: doc.eventId ? doc.eventId.toHexString() : null,
    ticketTypeIds: doc.ticketTypeIds ?? [],
    excludedEventIds: doc.excludedEventIds ?? [],
    eventTypeIds: doc.eventTypeIds ?? [],
    discountType: doc.discountType,
    value: doc.value,
    maxDiscount: doc.maxDiscount ?? null,
    minSeats: doc.minSeats ?? 1,
    minSubtotal: doc.minSubtotal ?? 0,
    eligibility: doc.eligibility,
    minPaidOrders: doc.minPaidOrders ?? 2,
    allowlist: doc.allowlist ?? [],
    totalUses: doc.totalUses ?? null,
    perCustomer: doc.perCustomer ?? 1,
    startAt: doc.startAt ?? null,
    endAt: doc.endAt ?? null,
    visibility: doc.visibility,
    used: doc.used ?? 0,
    held: doc.held ?? 0,
    revision: doc.revision,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const stored = (changes: VoucherChanges) => ({
  ...changes,
  eventId: changes.eventId ? oid(changes.eventId) : null,
});

const isDuplicate = (error: unknown) =>
  error instanceof mongo.MongoServerError && error.code === 11000;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const encodeCursor = (doc: { createdAt: Date; _id: Types.ObjectId }) =>
  Buffer.from(`${doc.createdAt.toISOString()}|${doc._id.toHexString()}`).toString("base64url");

function decodeCursor(cursor: string): { createdAt: Date; id: Types.ObjectId } | null {
  const [at, id] = Buffer.from(cursor, "base64url").toString().split("|");
  if (!at || !id || !Types.ObjectId.isValid(id) || Number.isNaN(Date.parse(at))) return null;
  return { createdAt: new Date(at), id: new Types.ObjectId(id) };
}

@Injectable()
export class MongoVoucherRepository implements VoucherRepository {
  constructor(@InjectModel(VOUCHER_MODEL) private readonly model: Model<VoucherDoc>) {}

  newId() {
    return new Types.ObjectId().toHexString();
  }

  async insert(id: string, changes: VoucherChanges, tx?: TxContext) {
    try {
      const [doc] = await this.model.create(
        [
          {
            ...stored(changes),
            _id: oid(id),
            status: "active",
            used: 0,
            held: 0,
            revision: 1,
            schemaVersion: 1,
          },
        ],
        { session: sessionOf(tx) },
      );
      return toRecord(doc!.toObject<VoucherDoc>());
    } catch (error) {
      if (isDuplicate(error)) throw new VoucherCodeTakenError();
      throw error;
    }
  }

  async update(id: string, revision: number, changes: VoucherChanges, tx?: TxContext) {
    try {
      const doc = await this.model
        .findOneAndUpdate(
          { _id: oid(id), revision },
          { $set: stored(changes), $inc: { revision: 1 } },
          { new: true, session: sessionOf(tx) },
        )
        .lean<VoucherDoc>()
        .exec();
      return doc ? toRecord(doc) : null;
    } catch (error) {
      if (isDuplicate(error)) throw new VoucherCodeTakenError();
      throw error;
    }
  }

  async setStatus(id: string, revision: number, status: VoucherStatus, tx?: TxContext) {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: oid(id), revision },
        { $set: { status }, $inc: { revision: 1 } },
        { new: true, session: sessionOf(tx) },
      )
      .lean<VoucherDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).lean<VoucherDoc>().exec();
    return doc ? toRecord(doc) : null;
  }

  async findByCode(code: string) {
    const doc = await this.model.findOne({ code }).lean<VoucherDoc>().exec();
    return doc ? toRecord(doc) : null;
  }

  async list(query: VoucherListQuery) {
    const filter: FilterQuery<VoucherDoc> = {};
    if (query.scope) filter.scope = query.scope;
    if (query.status) filter.status = query.status;
    if (query.eventId) {
      filter.$or = [
        { eventId: oid(query.eventId) },
        { scope: "global", excludedEventIds: { $ne: query.eventId } },
      ];
    }
    if (query.q) {
      const pattern = new RegExp(escapeRegex(query.q), "i");
      filter.$and = [{ $or: [{ code: pattern }, { name: pattern }] }];
    }
    const after = query.cursor ? decodeCursor(query.cursor) : null;
    const scoped: FilterQuery<VoucherDoc> = after
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
      .limit(query.limit + 1)
      .lean<VoucherDoc[]>()
      .exec();
    const items = docs.slice(0, query.limit);
    return {
      items: items.map(toRecord),
      nextCursor: docs.length > query.limit ? encodeCursor(items.at(-1)!) : null,
    };
  }

  async listPublic(eventId: string) {
    const docs = await this.model
      .find({
        status: "active",
        visibility: "public",
        $or: [{ eventId: oid(eventId) }, { scope: "global" }],
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean<VoucherDoc[]>()
      .exec();
    return docs.map(toRecord);
  }

  async take(id: string, into: "held" | "used", now: Date, tx: TxContext) {
    const result = await this.model
      .updateOne(
        {
          _id: oid(id),
          status: "active",
          $and: [
            { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
            { $or: [{ endAt: null }, { endAt: { $gt: now } }] },
            {
              $or: [
                { totalUses: null },
                { $expr: { $lt: [{ $add: ["$used", "$held"] }, "$totalUses"] } },
              ],
            },
          ],
        },
        { $inc: { [into]: 1 } },
        { session: sessionOf(tx) },
      )
      .exec();
    return result.modifiedCount === 1;
  }

  async convertHeld(id: string, tx: TxContext) {
    await this.model
      .updateOne({ _id: oid(id) }, { $inc: { held: -1, used: 1 } }, { session: sessionOf(tx) })
      .exec();
  }

  async releaseHeld(id: string, tx: TxContext) {
    await this.model
      .updateOne({ _id: oid(id) }, { $inc: { held: -1 } }, { session: sessionOf(tx) })
      .exec();
  }

  async addUsed(id: string, tx: TxContext) {
    await this.model
      .updateOne({ _id: oid(id) }, { $inc: { used: 1 } }, { session: sessionOf(tx) })
      .exec();
  }
}

type RedemptionDoc = Omit<RedemptionRecord, "voucherId" | "orderId"> & {
  voucherId: Types.ObjectId;
  orderId: Types.ObjectId;
};

const toRedemption = (doc: RedemptionDoc): RedemptionRecord => ({
  voucherId: doc.voucherId.toHexString(),
  orderId: doc.orderId.toHexString(),
  customerKey: doc.customerKey,
  emailNormalized: doc.emailNormalized,
  state: doc.state,
});

const STAMP: Record<RedemptionState, string> = {
  held: "heldAt",
  redeemed: "redeemedAt",
  released: "releasedAt",
};

@Injectable()
export class MongoVoucherRedemptionRepository implements VoucherRedemptionRepository {
  constructor(
    @InjectModel(VOUCHER_REDEMPTION_MODEL) private readonly model: Model<RedemptionDoc>,
  ) {}

  async insert(redemption: RedemptionRecord & { slot: number; at: Date }, tx: TxContext) {
    const { at, ...fields } = redemption;
    try {
      await this.model.create(
        [
          {
            ...fields,
            voucherId: oid(fields.voucherId),
            orderId: oid(fields.orderId),
            active: true,
            [STAMP[fields.state]]: at,
            schemaVersion: 1,
          },
        ],
        { session: sessionOf(tx) },
      );
    } catch (error) {
      if (isDuplicate(error)) throw new RedemptionTakenError();
      throw error;
    }
  }

  countActive(voucherId: string, customerKey: string, email: string, tx?: TxContext) {
    return this.model
      .countDocuments({
        voucherId: oid(voucherId),
        active: true,
        $or: [{ customerKey }, { emailNormalized: email }],
      })
      .session(sessionOf(tx) ?? null)
      .exec();
  }

  async findByOrder(orderId: string, tx?: TxContext) {
    const doc = await this.model
      .findOne({ orderId: oid(orderId) })
      .session(sessionOf(tx) ?? null)
      .lean<RedemptionDoc>()
      .exec();
    return doc ? toRedemption(doc) : null;
  }

  async transition(
    orderId: string,
    from: RedemptionState,
    to: RedemptionState,
    at: Date,
    tx: TxContext,
  ) {
    const doc = await this.model
      .findOneAndUpdate(
        { orderId: oid(orderId), state: from },
        { $set: { state: to, active: to !== "released", [STAMP[to]]: at } },
        { new: true, session: sessionOf(tx) },
      )
      .lean<RedemptionDoc>()
      .exec();
    return doc ? toRedemption(doc) : null;
  }
}

type Bucket = { key: string; count: number; expiresAt: Date };

/** Atomic fixed window, the same as identity-service's OTP limiter. */
@Injectable()
export class MongoRateLimiter implements RateLimiter {
  constructor(@InjectModel(RATE_LIMIT_BUCKET_MODEL) private readonly model: Model<Bucket>) {}

  async hit(key: string, limit: number, windowSeconds: number, now: Date) {
    const windowEnd = new Date(now.getTime() + windowSeconds * 1000);
    const update = [
      {
        $set: {
          restart: {
            $or: [
              { $eq: [{ $ifNull: ["$expiresAt", null] }, null] },
              { $lte: ["$expiresAt", now] },
            ],
          },
        },
      },
      {
        $set: {
          count: { $cond: ["$restart", 1, { $add: ["$count", 1] }] },
          expiresAt: { $cond: ["$restart", windowEnd, "$expiresAt"] },
        },
      },
      { $unset: "restart" },
    ];
    let bucket: Bucket | null = null;
    for (let attempt = 0; attempt < 2 && !bucket; attempt += 1) {
      try {
        bucket = await this.model
          .findOneAndUpdate({ key }, update, { upsert: true, new: true })
          .lean<Bucket>()
          .exec();
      } catch (error) {
        // Two first hits raced on the unique key: the second one retries as an update.
        if (!isDuplicate(error)) throw error;
      }
    }
    if (!bucket) throw new Error("rate limiter: no bucket after retry");
    return {
      allowed: bucket.count <= limit,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((bucket.expiresAt.getTime() - now.getTime()) / 1000),
      ),
    };
  }
}
