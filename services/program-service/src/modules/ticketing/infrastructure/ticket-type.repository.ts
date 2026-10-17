import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";

import type { TicketTypeRepository } from "../application/ports/ticket-type-repository.port";
import type { TicketTypeChanges, TicketTypeRecord } from "../domain/ticket-type";
import { TICKET_TYPE_MODEL } from "./ticket-type.model";

type TicketTypeDoc = Omit<TicketTypeRecord, "id" | "eventId"> & {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
};

function toRecord(doc: TicketTypeDoc): TicketTypeRecord {
  return {
    id: doc._id.toHexString(),
    eventId: doc.eventId.toHexString(),
    name: doc.name,
    description: doc.description ?? "",
    price: doc.price,
    quantity: doc.quantity ?? null,
    saleStartAt: doc.saleStartAt ?? null,
    saleEndAt: doc.saleEndAt ?? null,
    maxPerOrder: doc.maxPerOrder,
    sortOrder: doc.sortOrder ?? 0,
    hidden: doc.hidden ?? false,
    sold: doc.sold ?? 0,
    held: doc.held ?? 0,
    revision: doc.revision,
  };
}

const ORDER = { sortOrder: 1, _id: 1 } as const;

@Injectable()
export class MongoTicketTypeRepository implements TicketTypeRepository {
  constructor(@InjectModel(TICKET_TYPE_MODEL) private readonly model: Model<TicketTypeDoc>) {}

  async listByEvent(eventId: string, tx?: TxContext) {
    const docs = await this.model
      .find({ eventId: new Types.ObjectId(eventId) })
      .sort(ORDER)
      .session(sessionOf(tx) ?? null)
      .lean<TicketTypeDoc[]>()
      .exec();
    return docs.map(toRecord);
  }

  async listByEvents(eventIds: string[]) {
    const grouped = new Map<string, TicketTypeRecord[]>(eventIds.map((id) => [id, []]));
    if (eventIds.length === 0) return grouped;
    const docs = await this.model
      .find({ eventId: { $in: eventIds.map((id) => new Types.ObjectId(id)) } })
      .sort(ORDER)
      .lean<TicketTypeDoc[]>()
      .exec();
    for (const doc of docs) grouped.get(doc.eventId.toHexString())?.push(toRecord(doc));
    return grouped;
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).lean<TicketTypeDoc>().exec();
    return doc ? toRecord(doc) : null;
  }

  async insert(eventId: string, input: TicketTypeChanges, tx?: TxContext) {
    const [doc] = await this.model.create(
      [
        {
          ...input,
          eventId: new Types.ObjectId(eventId),
          sold: 0,
          held: 0,
          revision: 1,
          schemaVersion: 1,
        },
      ],
      { session: sessionOf(tx) },
    );
    return toRecord(doc!.toObject<TicketTypeDoc>());
  }

  async update(id: string, revision: number, changes: TicketTypeChanges, tx?: TxContext) {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, revision },
        { $set: changes, $inc: { revision: 1 } },
        { new: true, session: sessionOf(tx) },
      )
      .lean<TicketTypeDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }
}
