import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import { toSearchKey } from "@lavieco/shared";

import type { PriceItemRepository } from "../application/ports";
import type { PriceItemRecord } from "../domain/price-item";
import { PRICE_LIST_ITEM_MODEL } from "./sales.models";

type ItemDoc = Omit<PriceItemRecord, "id"> & { _id: Types.ObjectId; nameKey: string };

const toRecord = (doc: ItemDoc): PriceItemRecord => ({
  id: doc._id.toHexString(),
  name: doc.name,
  price: doc.price,
  active: doc.active,
  note: doc.note ?? "",
  sortOrder: doc.sortOrder ?? 0,
  revision: doc.revision,
  updatedAt: doc.updatedAt,
});

@Injectable()
export class MongoPriceItemRepository implements PriceItemRepository {
  constructor(@InjectModel(PRICE_LIST_ITEM_MODEL) private readonly model: Model<ItemDoc>) {}

  newId() {
    return new Types.ObjectId().toHexString();
  }

  async list() {
    const docs = await this.model.find().sort({ sortOrder: 1, name: 1 }).lean<ItemDoc[]>().exec();
    return docs.map(toRecord);
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(new Types.ObjectId(id)).lean<ItemDoc>().exec();
    return doc ? toRecord(doc) : null;
  }

  async findByIds(ids: string[]) {
    const valid = ids.filter((id) => Types.ObjectId.isValid(id));
    const docs = await this.model
      .find({ _id: { $in: valid.map((id) => new Types.ObjectId(id)) } })
      .lean<ItemDoc[]>()
      .exec();
    return docs.map(toRecord);
  }

  async findByName(name: string) {
    const doc = await this.model
      .findOne({ nameKey: toSearchKey(name) })
      .lean<ItemDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async insert(record: Omit<PriceItemRecord, "revision" | "updatedAt">, tx?: TxContext) {
    const { id, ...rest } = record;
    const [doc] = await this.model.create(
      [{ ...rest, _id: new Types.ObjectId(id), nameKey: toSearchKey(rest.name), revision: 1 }],
      { session: sessionOf(tx) },
    );
    return toRecord(doc!.toObject<ItemDoc>());
  }

  async update(
    id: string,
    revision: number,
    changes: Partial<Omit<PriceItemRecord, "id" | "revision" | "updatedAt">>,
    tx?: TxContext,
  ) {
    if (!Types.ObjectId.isValid(id)) return null;
    const set = changes.name ? { ...changes, nameKey: toSearchKey(changes.name) } : changes;
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), revision },
        { $set: set, $inc: { revision: 1 } },
        { new: true, session: sessionOf(tx) },
      )
      .lean<ItemDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }
}
