import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";

import type {
  OrderAnswerRepository,
  PaymentEventInput,
  PaymentEventRecord,
  PaymentEventRepository,
  TicketRepository,
} from "../application/ports/order-repositories.port";
import type { OrderAnswer } from "../domain/order";
import type { NewTicket, TicketRecord } from "../domain/ticket";
import { ORDER_ANSWER_MODEL, PAYMENT_EVENT_MODEL, TICKET_MODEL } from "./order.models";

type TicketDoc = Omit<TicketRecord, "id" | "orderId" | "eventId" | "ticketTypeId"> & {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  eventId: Types.ObjectId;
  ticketTypeId: Types.ObjectId;
};

function toTicket(doc: TicketDoc): TicketRecord {
  return {
    id: doc._id.toHexString(),
    code: doc.code,
    qrToken: doc.qrToken,
    orderId: doc.orderId.toHexString(),
    eventId: doc.eventId.toHexString(),
    ticketTypeId: doc.ticketTypeId.toHexString(),
    ticketTypeName: doc.ticketTypeName,
    status: doc.status,
    checkedInAt: doc.checkedInAt ?? null,
    checkedInBy: doc.checkedInBy ?? null,
    createdAt: doc.createdAt,
  };
}

const oid = (id: string) => new Types.ObjectId(id);

@Injectable()
export class MongoTicketRepository implements TicketRepository {
  constructor(@InjectModel(TICKET_MODEL) private readonly model: Model<TicketDoc>) {}

  async insertMany(tickets: NewTicket[], tx: TxContext) {
    const docs = await this.model.create(
      tickets.map((ticket) => ({
        ...ticket,
        orderId: oid(ticket.orderId),
        eventId: oid(ticket.eventId),
        ticketTypeId: oid(ticket.ticketTypeId),
        status: "valid",
        schemaVersion: 1,
      })),
      { session: sessionOf(tx), ordered: true },
    );
    return docs.map((doc) => toTicket(doc.toObject<TicketDoc>()));
  }

  async existingCodes(codes: string[], tx: TxContext) {
    const docs = await this.model
      .find({ code: { $in: codes } }, { code: 1 })
      .session(sessionOf(tx) ?? null)
      .lean<{ code: string }[]>()
      .exec();
    return new Set(docs.map((doc) => doc.code));
  }

  async listByOrder(orderId: string, tx?: TxContext) {
    const docs = await this.model
      .find({ orderId: oid(orderId) })
      .sort({ _id: 1 })
      .session(sessionOf(tx) ?? null)
      .lean<TicketDoc[]>()
      .exec();
    return docs.map(toTicket);
  }

  async listByOrders(orderIds: string[]) {
    const grouped = new Map<string, TicketRecord[]>(orderIds.map((id) => [id, []]));
    if (orderIds.length === 0) return grouped;
    const docs = await this.model
      .find({ orderId: { $in: orderIds.map(oid) } })
      .sort({ _id: 1 })
      .lean<TicketDoc[]>()
      .exec();
    for (const doc of docs) grouped.get(doc.orderId.toHexString())?.push(toTicket(doc));
    return grouped;
  }

  async voidByOrder(orderId: string, at: Date, tx: TxContext) {
    const result = await this.model
      .updateMany(
        { orderId: oid(orderId), status: { $in: ["valid", "used"] } },
        { $set: { status: "void", voidedAt: at } },
        { session: sessionOf(tx) },
      )
      .exec();
    return result.modifiedCount;
  }

  async findByQrToken(qrToken: string) {
    const doc = await this.model.findOne({ qrToken }).lean<TicketDoc>().exec();
    return doc ? toTicket(doc) : null;
  }

  async findByCode(code: string) {
    const doc = await this.model.findOne({ code }).lean<TicketDoc>().exec();
    return doc ? toTicket(doc) : null;
  }

  async checkIn(id: string, eventId: string, by: string, at: Date) {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: oid(id), eventId: oid(eventId), status: "valid" },
        { $set: { status: "used", checkedInAt: at, checkedInBy: by } },
        { new: true },
      )
      .lean<TicketDoc>()
      .exec();
    return doc ? toTicket(doc) : null;
  }

  async countByEvent(eventId: string) {
    const [checkedIn, total] = await Promise.all([
      this.model.countDocuments({ eventId: oid(eventId), status: "used" }).exec(),
      this.model
        .countDocuments({ eventId: oid(eventId), status: { $in: ["valid", "used"] } })
        .exec(),
    ]);
    return { checkedIn, total };
  }
}

type AnswerDoc = { orderId: Types.ObjectId; answers: OrderAnswer[] };

@Injectable()
export class MongoOrderAnswerRepository implements OrderAnswerRepository {
  constructor(@InjectModel(ORDER_ANSWER_MODEL) private readonly model: Model<AnswerDoc>) {}

  async insert(orderId: string, eventId: string, answers: OrderAnswer[], tx: TxContext) {
    await this.model.create(
      [{ orderId: oid(orderId), eventId: oid(eventId), answers, schemaVersion: 1 }],
      { session: sessionOf(tx) },
    );
  }

  async findByOrders(orderIds: string[]) {
    const result = new Map<string, OrderAnswer[]>();
    if (orderIds.length === 0) return result;
    const docs = await this.model
      .find({ orderId: { $in: orderIds.map(oid) } })
      .lean<AnswerDoc[]>()
      .exec();
    for (const doc of docs) {
      result.set(
        doc.orderId.toHexString(),
        doc.answers.map((answer) => ({ questionId: answer.questionId, value: answer.value })),
      );
    }
    return result;
  }
}

type PaymentEventDoc = PaymentEventInput & { createdAt: Date };

@Injectable()
export class MongoPaymentEventRepository implements PaymentEventRepository {
  constructor(@InjectModel(PAYMENT_EVENT_MODEL) private readonly model: Model<PaymentEventDoc>) {}

  async insert(event: PaymentEventInput, tx?: TxContext) {
    await this.model.create([{ ...event, schemaVersion: 1 }], { session: sessionOf(tx) });
  }

  async listByOrderCode(orderCode: number): Promise<PaymentEventRecord[]> {
    const docs = await this.model
      .find({ orderCode })
      .sort({ createdAt: 1 })
      .lean<PaymentEventDoc[]>()
      .exec();
    return docs.map((doc) => ({
      orderCode: doc.orderCode,
      source: doc.source,
      amount: doc.amount,
      reference: doc.reference ?? null,
      paymentLinkId: doc.paymentLinkId ?? null,
      transactionAt: doc.transactionAt ?? null,
      outcome: doc.outcome,
      createdAt: doc.createdAt,
    }));
  }
}
