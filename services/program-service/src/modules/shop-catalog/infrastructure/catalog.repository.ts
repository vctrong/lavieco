import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types, mongo } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import { SHOP_SETTINGS_DEFAULTS, type ShopSettingsInput } from "@lavieco/shared/shop";

import { UniqueKeyTakenError, type CatalogRepository } from "../application/ports";
import type { BrandRecord, CategoryRecord, ShopSettingsRecord } from "../domain/catalog";
import { PARTNER_BRAND_MODEL, PRODUCT_CATEGORY_MODEL, SHOP_SETTINGS_MODEL } from "./catalog.models";

type CategoryDoc = Omit<CategoryRecord, "id"> & { _id: Types.ObjectId };
type BrandDoc = Omit<BrandRecord, "id" | "logo"> & {
  _id: Types.ObjectId;
  logo: (Omit<NonNullable<BrandRecord["logo"]>, "mediaId"> & { mediaId: Types.ObjectId }) | null;
};
type SettingsDoc = ShopSettingsRecord & { _id: string };

const SETTINGS_ID = "settings";
const oid = (id: string) => new Types.ObjectId(id);
export const isDuplicate = (error: unknown) =>
  error instanceof mongo.MongoServerError && error.code === 11000;

const toCategory = (doc: CategoryDoc): CategoryRecord => ({
  id: doc._id.toHexString(),
  key: doc.key,
  name: doc.name,
  description: doc.description ?? "",
  sortOrder: doc.sortOrder ?? 0,
  archivedAt: doc.archivedAt ?? null,
  revision: doc.revision,
});

const toBrand = (doc: BrandDoc): BrandRecord => ({
  id: doc._id.toHexString(),
  slug: doc.slug,
  name: doc.name,
  story: doc.story ?? "",
  website: doc.website ?? "",
  logo: doc.logo ? { ...doc.logo, mediaId: doc.logo.mediaId.toHexString() } : null,
  commissionRate: doc.commissionRate ?? 0,
  active: doc.active ?? true,
  revision: doc.revision,
});

const toSettings = (doc: SettingsDoc): ShopSettingsRecord => ({
  shippingFee: doc.shippingFee,
  freeShippingFrom: doc.freeShippingFrom ?? null,
  pickup: {
    enabled: doc.pickup?.enabled ?? false,
    address: doc.pickup?.address ?? "",
    note: doc.pickup?.note ?? "",
  },
  cod: { enabled: doc.cod?.enabled ?? false, maxAmount: doc.cod?.maxAmount ?? 0 },
  holdMinutes: doc.holdMinutes,
  returnDays: doc.returnDays,
  revision: doc.revision,
});

async function unique<T>(key: UniqueKeyTakenError["key"], run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isDuplicate(error)) throw new UniqueKeyTakenError(key);
    throw error;
  }
}

@Injectable()
export class MongoCatalogRepository implements CatalogRepository {
  constructor(
    @InjectModel(PRODUCT_CATEGORY_MODEL) private readonly categories: Model<CategoryDoc>,
    @InjectModel(PARTNER_BRAND_MODEL) private readonly brands: Model<BrandDoc>,
    @InjectModel(SHOP_SETTINGS_MODEL) private readonly settings: Model<SettingsDoc>,
  ) {}

  newId() {
    return new Types.ObjectId().toHexString();
  }

  async listCategories(includeArchived: boolean) {
    const filter = includeArchived ? {} : { archivedAt: null };
    const docs = await this.categories
      .find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean<CategoryDoc[]>()
      .exec();
    return docs.map(toCategory);
  }

  async findCategory(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.categories.findById(oid(id)).lean<CategoryDoc>().exec();
    return doc ? toCategory(doc) : null;
  }

  async findCategoryByKey(key: string) {
    const doc = await this.categories.findOne({ key }).lean<CategoryDoc>().exec();
    return doc ? toCategory(doc) : null;
  }

  insertCategory(record: Omit<CategoryRecord, "revision">, tx?: TxContext) {
    return unique("category", async () => {
      const { id, ...rest } = record;
      const [doc] = await this.categories.create([{ ...rest, _id: oid(id), revision: 1 }], {
        session: sessionOf(tx),
      });
      return toCategory(doc!.toObject<CategoryDoc>());
    });
  }

  updateCategory(
    id: string,
    revision: number,
    changes: Pick<CategoryRecord, "name" | "description" | "sortOrder" | "archivedAt">,
    tx?: TxContext,
  ) {
    return unique("category", async () => {
      const doc = await this.categories
        .findOneAndUpdate(
          { _id: oid(id), revision },
          { $set: changes, $inc: { revision: 1 } },
          { new: true, session: sessionOf(tx) },
        )
        .lean<CategoryDoc>()
        .exec();
      return doc ? toCategory(doc) : null;
    });
  }

  async listBrands() {
    const docs = await this.brands.find().sort({ name: 1 }).lean<BrandDoc[]>().exec();
    return docs.map(toBrand);
  }

  async findBrand(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.brands.findById(oid(id)).lean<BrandDoc>().exec();
    return doc ? toBrand(doc) : null;
  }

  async findBrandBySlug(slug: string) {
    const doc = await this.brands.findOne({ slug }).lean<BrandDoc>().exec();
    return doc ? toBrand(doc) : null;
  }

  insertBrand(record: Omit<BrandRecord, "revision">, tx?: TxContext) {
    return unique("brand", async () => {
      const { id, logo, ...rest } = record;
      const [doc] = await this.brands.create(
        [
          {
            ...rest,
            logo: logo ? { ...logo, mediaId: oid(logo.mediaId) } : null,
            _id: oid(id),
            revision: 1,
          },
        ],
        { session: sessionOf(tx) },
      );
      return toBrand(doc!.toObject<BrandDoc>());
    });
  }

  updateBrand(
    id: string,
    revision: number,
    changes: Omit<BrandRecord, "id" | "revision">,
    tx?: TxContext,
  ) {
    return unique("brand", async () => {
      const { logo, ...rest } = changes;
      const doc = await this.brands
        .findOneAndUpdate(
          { _id: oid(id), revision },
          {
            $set: { ...rest, logo: logo ? { ...logo, mediaId: oid(logo.mediaId) } : null },
            $inc: { revision: 1 },
          },
          { new: true, session: sessionOf(tx) },
        )
        .lean<BrandDoc>()
        .exec();
      return doc ? toBrand(doc) : null;
    });
  }

  async getSettings() {
    const doc = await this.settings.findById(SETTINGS_ID).lean<SettingsDoc>().exec();
    return doc
      ? toSettings(doc)
      : { ...structuredClone(SHOP_SETTINGS_DEFAULTS), freeShippingFrom: null, revision: 0 };
  }

  /** Revision 0 = defaults never saved: the first save creates the document. */
  async saveSettings(revision: number, input: ShopSettingsInput, tx?: TxContext) {
    const session = sessionOf(tx);
    if (revision === 0) {
      try {
        const [doc] = await this.settings.create(
          [{ ...input, _id: SETTINGS_ID, revision: 1, schemaVersion: 1 }],
          { session },
        );
        return toSettings(doc!.toObject<SettingsDoc>());
      } catch (error) {
        if (isDuplicate(error)) return null;
        throw error;
      }
    }
    const doc = await this.settings
      .findOneAndUpdate(
        { _id: SETTINGS_ID, revision },
        { $set: input, $inc: { revision: 1 } },
        { new: true, session },
      )
      .lean<SettingsDoc>()
      .exec();
    return doc ? toSettings(doc) : null;
  }
}
