import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type FilterQuery, type Model, Types } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import { toSearchKey } from "@lavieco/shared";
import {
  SALES_ORDER_STATUSES,
  SALES_ORDER_VIEWS,
  type SalesOrderListQuery,
  type SalesOrderSort,
  type SalesOrderStatus,
  type SalesOrderView,
  type StaffRef,
} from "@lavieco/shared/sales";

import type {
  MonthRevenue,
  SalesOrderChanges,
  SalesOrderRepository,
  SalesOrderWrite,
} from "../application/ports";
import {
  OPEN_STATUSES,
  OUTSTANDING_PAYMENTS,
  TODO_STATUSES,
  type SalesOrderRecord,
} from "../domain/sales-order";
import { COUNTER_MODEL, SALES_ORDER_MODEL } from "./sales.models";

type OrderDoc = Omit<SalesOrderRecord, "id"> & {
  _id: Types.ObjectId;
  search?: { key: string };
};
type CounterDoc = { _id: string; seq: number };

const SEQ_ID = "sales_order";
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const encodeOffset = (offset: number) => Buffer.from(`o:${offset}`).toString("base64url");
function decodeOffset(cursor?: string) {
  if (!cursor) return 0;
  const offset = Number(Buffer.from(cursor, "base64url").toString().split(":")[1]);
  return Number.isInteger(offset) && offset >= 0 ? offset : 0;
}

const SORT_FIELD: Record<SalesOrderSort, string> = {
  order_day: "orderDay",
  due_day: "dueDay",
  total: "total",
  code: "code",
  created_at: "createdAt",
};

const searchKeyOf = (order: Pick<SalesOrderRecord, "code" | "legacyCode" | "customer">) =>
  toSearchKey(
    [order.code, order.legacyCode ?? "", order.customer.name, order.customer.phone].join(" "),
  );

const toRecord = (doc: OrderDoc): SalesOrderRecord => ({
  id: doc._id.toHexString(),
  code: doc.code,
  legacyCode: doc.legacyCode ?? null,
  source: doc.source,
  shopOrderId: doc.shopOrderId ?? null,
  orderType: doc.orderType,
  customer: {
    name: doc.customer.name,
    phone: doc.customer.phone ?? "",
    phoneNormalized: doc.customer.phoneNormalized ?? null,
    address: doc.customer.address ?? null,
  },
  channel: doc.channel,
  items: (doc.items ?? []).map((item) => ({
    priceItemId: item.priceItemId ?? null,
    name: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
  })),
  subtotal: doc.subtotal,
  shippingFee: doc.shippingFee,
  discount: doc.discount,
  total: doc.total,
  paymentMethod: doc.paymentMethod ?? null,
  paymentStatus: doc.paymentStatus,
  status: doc.status,
  orderDay: doc.orderDay ?? null,
  dueDay: doc.dueDay ?? null,
  assignee: doc.assignee ?? null,
  note: doc.note ?? "",
  createdBy: doc.createdBy ?? null,
  updatedBy: doc.updatedBy ?? null,
  deletedAt: doc.deletedAt ?? null,
  revision: doc.revision,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

function viewFilter(view: SalesOrderView, today: string): FilterQuery<OrderDoc> {
  switch (view) {
    case "todo":
      return { status: { $in: TODO_STATUSES } };
    case "overdue":
      return { status: { $in: OPEN_STATUSES }, dueDay: { $type: "string", $lt: today } };
    case "shipping":
      return { status: "shipping" };
    case "unpaid":
      return { paymentStatus: { $in: OUTSTANDING_PAYMENTS }, status: { $ne: "cancelled" } };
    case "all":
      return {};
  }
}

const ALIVE = { deletedAt: null };
const NOT_CANCELLED = { status: { $ne: "cancelled" } };

@Injectable()
export class MongoSalesOrderRepository implements SalesOrderRepository {
  constructor(
    @InjectModel(SALES_ORDER_MODEL) private readonly model: Model<OrderDoc>,
    @InjectModel(COUNTER_MODEL) private readonly counters: Model<CounterDoc>,
  ) {}

  newId() {
    return new Types.ObjectId().toHexString();
  }

  async nextSeq(tx: TxContext) {
    const doc = await this.counters
      .findOneAndUpdate(
        { _id: SEQ_ID },
        { $inc: { seq: 1 } },
        { upsert: true, new: true, session: sessionOf(tx) },
      )
      .lean<CounterDoc>()
      .exec();
    return doc!.seq;
  }

  async insert(record: SalesOrderWrite, tx?: TxContext) {
    const { id, ...rest } = record;
    const [doc] = await this.model.create(
      [{ ...rest, _id: new Types.ObjectId(id), search: { key: searchKeyOf(record) }, revision: 1 }],
      { session: sessionOf(tx) },
    );
    return toRecord(doc!.toObject<OrderDoc>());
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(new Types.ObjectId(id)).lean<OrderDoc>().exec();
    return doc ? toRecord(doc) : null;
  }

  async findByLegacyCode(legacyCode: string) {
    const doc = await this.model.findOne({ legacyCode }).lean<OrderDoc>().exec();
    return doc ? toRecord(doc) : null;
  }

  async findByShopOrderId(shopOrderId: string, tx?: TxContext) {
    const doc = await this.model
      .findOne({ shopOrderId })
      .session(sessionOf(tx) ?? null)
      .lean<OrderDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async update(
    id: string,
    revision: number,
    changes: Partial<SalesOrderChanges> & { deletedAt?: Date | null },
    tx?: TxContext,
  ) {
    if (!Types.ObjectId.isValid(id)) return null;
    const session = sessionOf(tx);
    const current = await this.model
      .findOne({ _id: new Types.ObjectId(id), revision })
      .session(session ?? null)
      .lean<OrderDoc>()
      .exec();
    if (!current) return null;
    const next = { ...toRecord(current), ...changes };
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), revision },
        { $set: { ...changes, "search.key": searchKeyOf(next) }, $inc: { revision: 1 } },
        { new: true, session },
      )
      .lean<OrderDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async upsertMirror(
    shopOrderId: string,
    insert: SalesOrderWrite,
    mirrored: Partial<SalesOrderChanges>,
    tx?: TxContext,
  ) {
    const { id, ...rest } = insert;
    const onInsert = Object.fromEntries(Object.entries(rest).filter(([key]) => !(key in mirrored)));
    await this.model
      .updateOne(
        { shopOrderId },
        {
          $set: { ...mirrored, "search.key": searchKeyOf(insert) },
          $setOnInsert: { ...onInsert, _id: new Types.ObjectId(id), schemaVersion: 1 },
          $inc: { revision: 1 },
        },
        { upsert: true, session: sessionOf(tx) },
      )
      .exec();
  }

  async setStatusMany(
    ids: string[],
    status: SalesOrderStatus,
    updatedBy: StaffRef | null,
    tx?: TxContext,
  ) {
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    // A made-to-order order without a due day may only be cancelled (domain rule).
    const filter: FilterQuery<OrderDoc> = {
      _id: { $in: objectIds },
      source: "manual",
      ...ALIVE,
      ...(status === "cancelled"
        ? {}
        : { $or: [{ orderType: { $ne: "made_to_order" } }, { dueDay: { $type: "string" } }] }),
    };
    const result = await this.model
      .updateMany(
        filter,
        { $set: { status, updatedBy }, $inc: { revision: 1 } },
        {
          session: sessionOf(tx),
        },
      )
      .exec();
    return result.modifiedCount;
  }

  async list(query: SalesOrderListQuery, today: string) {
    const and: FilterQuery<OrderDoc>[] = [
      { deletedAt: query.deleted ? { $ne: null } : null },
      viewFilter(query.view, today),
    ];
    if (query.status?.length) and.push({ status: { $in: query.status } });
    if (query.paymentStatus?.length) and.push({ paymentStatus: { $in: query.paymentStatus } });
    if (query.orderType?.length) and.push({ orderType: { $in: query.orderType } });
    if (query.channel?.length) and.push({ channel: { $in: query.channel } });
    if (query.source) and.push({ source: query.source });
    if (query.assigneeId)
      and.push(
        query.assigneeId === "none" ? { assignee: null } : { "assignee.id": query.assigneeId },
      );
    if (query.from) and.push({ orderDay: { $gte: query.from } });
    if (query.to) and.push({ orderDay: { $lte: query.to } });
    if (query.q) {
      const key = toSearchKey(query.q);
      if (key) and.push({ "search.key": new RegExp(escapeRegex(key)) });
    }
    const filter = { $and: and };
    const offset = decodeOffset(query.cursor);
    const direction = query.dir === "asc" ? 1 : -1;
    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ [SORT_FIELD[query.sort]]: direction, createdAt: direction, _id: direction })
        .skip(offset)
        .limit(query.limit + 1)
        .lean<OrderDoc[]>()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return {
      items: docs.slice(0, query.limit).map(toRecord),
      nextCursor: docs.length > query.limit ? encodeOffset(offset + query.limit) : null,
      total,
    };
  }

  async countViews(today: string) {
    const counts = await Promise.all(
      SALES_ORDER_VIEWS.map((view) =>
        this.model.countDocuments({ ...ALIVE, ...viewFilter(view, today) }).exec(),
      ),
    );
    return Object.fromEntries(SALES_ORDER_VIEWS.map((view, i) => [view, counts[i]!])) as Record<
      SalesOrderView,
      number
    >;
  }

  async countByStatus() {
    const rows = await this.model
      .aggregate<{ _id: SalesOrderStatus; count: number }>([
        { $match: ALIVE },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .exec();
    const out = Object.fromEntries(SALES_ORDER_STATUSES.map((status) => [status, 0])) as Record<
      SalesOrderStatus,
      number
    >;
    for (const row of rows) out[row._id] = row.count;
    return out;
  }

  async outstanding() {
    const [row] = await this.model
      .aggregate<{ orders: number; amount: number }>([
        { $match: { ...ALIVE, ...NOT_CANCELLED, paymentStatus: { $in: OUTSTANDING_PAYMENTS } } },
        { $group: { _id: null, orders: { $sum: 1 }, amount: { $sum: "$total" } } },
      ])
      .exec();
    return { orders: row?.orders ?? 0, amount: row?.amount ?? 0 };
  }

  async revenueByMonth(fromMonth: string): Promise<MonthRevenue[]> {
    return this.model
      .aggregate<MonthRevenue>([
        { $match: { ...ALIVE, ...NOT_CANCELLED, orderDay: { $type: "string", $gte: fromMonth } } },
        {
          $group: {
            _id: { $substrBytes: ["$orderDay", 0, 7] },
            orders: { $sum: 1 },
            revenue: { $sum: "$total" },
          },
        },
        { $project: { _id: 0, month: "$_id", orders: 1, revenue: 1 } },
        { $sort: { month: 1 } },
      ])
      .exec();
  }

  async latestByPhone(phoneNormalized: string) {
    const filter = { ...ALIVE, "customer.phoneNormalized": phoneNormalized };
    const [doc, orders] = await Promise.all([
      this.model.findOne(filter).sort({ orderDay: -1, createdAt: -1 }).lean<OrderDoc>().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return doc ? { order: toRecord(doc), orders } : null;
  }

  async listAllForExport() {
    const docs = await this.model
      .find(ALIVE)
      .sort({ orderDay: 1, createdAt: 1, _id: 1 })
      .lean<OrderDoc[]>()
      .exec();
    return docs.map(toRecord);
  }
}
