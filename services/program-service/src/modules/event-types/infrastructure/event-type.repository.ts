import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types, mongo } from "mongoose";

import { DomainError, type LocalizedText } from "@lavieco/shared";

import type { EventTypeRepository } from "../application/ports/event-type-repository.port";
import type { EventTypeRecord } from "../domain/event-type";
import { EVENT_TYPE_MODEL } from "./event-type.model";

type EventTypeDoc = {
  _id: Types.ObjectId;
  key: string;
  name: LocalizedText;
  sortOrder: number;
  archivedAt: Date | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(doc: EventTypeDoc): EventTypeRecord {
  return {
    id: doc._id.toHexString(),
    key: doc.key,
    name: doc.name.en ? { vi: doc.name.vi, en: doc.name.en } : { vi: doc.name.vi },
    sortOrder: doc.sortOrder,
    archivedAt: doc.archivedAt ?? null,
    revision: doc.revision,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

@Injectable()
export class MongoEventTypeRepository implements EventTypeRepository {
  constructor(@InjectModel(EVENT_TYPE_MODEL) private readonly model: Model<EventTypeDoc>) {}

  async list({ includeArchived }: { includeArchived: boolean }) {
    const docs = await this.model
      .find(includeArchived ? {} : { archivedAt: null })
      .sort({ sortOrder: 1, _id: 1 })
      .lean<EventTypeDoc[]>()
      .exec();
    return docs.map(toRecord);
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).lean<EventTypeDoc>().exec();
    return doc ? toRecord(doc) : null;
  }

  async findByIds(ids: string[]) {
    const valid = ids.filter((id) => Types.ObjectId.isValid(id));
    if (valid.length === 0) return [];
    const docs = await this.model
      .find({ _id: { $in: valid } })
      .lean<EventTypeDoc[]>()
      .exec();
    return docs.map(toRecord);
  }

  async insert(input: { key: string; name: LocalizedText; sortOrder: number }) {
    try {
      const [doc] = await this.model.create([
        { ...input, archivedAt: null, revision: 1, schemaVersion: 1 },
      ]);
      return toRecord(doc!.toObject<EventTypeDoc>());
    } catch (error) {
      if (error instanceof mongo.MongoServerError && error.code === 11000) {
        throw new DomainError("event_type.name_taken");
      }
      throw error;
    }
  }

  async update(
    id: string,
    revision: number,
    changes: { name?: LocalizedText; sortOrder?: number; archivedAt?: Date | null },
  ) {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, revision },
        { $set: changes, $inc: { revision: 1 } },
        { new: true },
      )
      .lean<EventTypeDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }
}
