import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type FilterQuery, type Model, type SortOrder, Types } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import { toSearchKey } from "@lavieco/shared";
import type { ProductListQuery, ProductStatus, PublicProductSort } from "@lavieco/shared/shop";

import {
  UniqueKeyTakenError,
  type ProductInsert,
  type ProductRepository,
  type ProductUpdate,
  type PublicProductQuery,
  type VariantWrite,
} from "../application/ports";
import type { StockMovementRecord } from "../domain/catalog";
import { isLive, type ProductRecord, type VariantRecord } from "../domain/product";
import { isDuplicate } from "./catalog.repository";
import { PRODUCT_MODEL, PRODUCT_VARIANT_MODEL, STOCK_MOVEMENT_MODEL } from "./catalog.models";

type ImageDoc = Omit<ProductRecord["images"][number], "mediaId"> & { mediaId: Types.ObjectId };
type ProductDoc = Omit<ProductRecord, "id" | "categoryId" | "partnerBrandId" | "images"> & {
  _id: Types.ObjectId;
  categoryId: Types.ObjectId;
  partnerBrandId: Types.ObjectId | null;
  images: ImageDoc[];
  live: boolean;
  search?: { key: string };
};
type VariantDoc = Omit<VariantRecord, "id" | "productId"> & {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
};
type MovementDoc = Omit<
  StockMovementRecord,
  "id" | "variantId" | "productId" | "orderId" | "importJobId"
> & {
  _id: Types.ObjectId;
  variantId: Types.ObjectId;
  productId: Types.ObjectId;
  orderId: Types.ObjectId | null;
  importJobId: Types.ObjectId | null;
};

const oid = (id: string) => new Types.ObjectId(id);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function toProduct(doc: ProductDoc): ProductRecord {
  return {
    id: doc._id.toHexString(),
    slug: doc.slug,
    slugHistory: doc.slugHistory ?? [],
    title: doc.title,
    summary: doc.summary ?? "",
    categoryId: doc.categoryId.toHexString(),
    partnerBrandId: doc.partnerBrandId ? doc.partnerBrandId.toHexString() : null,
    story: {
      message: doc.story?.message ?? "",
      story: doc.story?.story ?? "",
      lesson: doc.story?.lesson ?? "",
    },
    handbookLink: doc.handbookLink?.slug ? doc.handbookLink : null,
    materials: doc.materials ?? [],
    care: doc.care ?? "",
    dimensions: doc.dimensions ?? "",
    options: (doc.options ?? []).map((o) => ({
      key: o.key,
      name: o.name,
      values: o.values.map((v) => ({ key: v.key, label: v.label })),
    })),
    images: (doc.images ?? []).map((image) => ({
      mediaId: image.mediaId.toHexString(),
      publicId: image.publicId,
      width: image.width,
      height: image.height,
      alt: image.alt ?? "",
      variantValues: image.variantValues ?? [],
    })),
    impact: {
      items: (doc.impact?.items ?? []).map((i) => ({
        label: i.label,
        value: i.value,
        unit: i.unit ?? "",
        source: i.source,
      })),
      status: doc.impact?.status ?? "none",
      approvedBy: doc.impact?.approvedBy ?? null,
      approvedAt: doc.impact?.approvedAt ?? null,
    },
    seo: { title: doc.seo?.title ?? "", description: doc.seo?.description ?? "" },
    badges: doc.badges ?? [],
    sortOrder: doc.sortOrder ?? 0,
    status: doc.status,
    priceMin: doc.priceMin ?? 0,
    priceMax: doc.priceMax ?? 0,
    publishedAt: doc.publishedAt ?? null,
    revision: doc.revision,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const toVariant = (doc: VariantDoc): VariantRecord => ({
  id: doc._id.toHexString(),
  productId: doc.productId.toHexString(),
  sku: doc.sku,
  optionKey: doc.optionKey,
  optionValues: { ...(doc.optionValues ?? {}) },
  price: doc.price,
  compareAtPrice: doc.compareAtPrice ?? null,
  lowStockThreshold: doc.lowStockThreshold ?? 0,
  weightGrams: doc.weightGrams ?? null,
  status: doc.status,
  sortOrder: doc.sortOrder ?? 0,
  stock: {
    onHand: doc.stock?.onHand ?? 0,
    held: doc.stock?.held ?? 0,
    sold: doc.stock?.sold ?? 0,
  },
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

function stored(changes: Omit<ProductUpdate, "slugHistory"> & { slugHistory?: string[] }) {
  const { searchKey, ...withItems } = changes;
  const rest: Partial<typeof withItems> = { ...withItems };
  delete rest.impactItems;
  return {
    ...rest,
    categoryId: oid(changes.categoryId),
    partnerBrandId: changes.partnerBrandId ? oid(changes.partnerBrandId) : null,
    images: changes.images.map((image) => ({ ...image, mediaId: oid(image.mediaId) })),
    search: { key: searchKey },
  };
}

/** Offset cursor, opaque to callers: the catalogue is small (tens to hundreds of items). */
const encodeOffset = (offset: number) => Buffer.from(`o:${offset}`).toString("base64url");
function decodeOffset(cursor?: string): number {
  if (!cursor) return 0;
  const [tag, value] = Buffer.from(cursor, "base64url").toString().split(":");
  const offset = Number(value);
  return tag === "o" && Number.isInteger(offset) && offset >= 0 ? offset : 0;
}

const PUBLIC_SORT: Record<PublicProductSort, Record<string, SortOrder>> = {
  featured: { sortOrder: 1, publishedAt: -1, _id: -1 },
  newest: { publishedAt: -1, _id: -1 },
  price_asc: { priceMin: 1, _id: -1 },
  price_desc: { priceMax: -1, _id: -1 },
};

async function unique<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isDuplicate(error)) {
      const message = error instanceof Error ? error.message : "";
      throw new UniqueKeyTakenError(message.includes("sku") ? "sku" : "slug");
    }
    throw error;
  }
}

@Injectable()
export class MongoProductRepository implements ProductRepository {
  constructor(
    @InjectModel(PRODUCT_MODEL) private readonly products: Model<ProductDoc>,
    @InjectModel(PRODUCT_VARIANT_MODEL) private readonly variants: Model<VariantDoc>,
    @InjectModel(STOCK_MOVEMENT_MODEL) private readonly movements: Model<MovementDoc>,
  ) {}

  newId() {
    return new Types.ObjectId().toHexString();
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.products.findById(oid(id)).lean<ProductDoc>().exec();
    return doc ? toProduct(doc) : null;
  }

  async findBySlug(slug: string) {
    const doc =
      (await this.products.findOne({ slug }).lean<ProductDoc>().exec()) ??
      (await this.products.findOne({ slugHistory: slug }).lean<ProductDoc>().exec());
    return doc ? toProduct(doc) : null;
  }

  insert(product: ProductInsert, tx: TxContext) {
    return unique(async () => {
      const { id, ...rest } = product;
      const [doc] = await this.products.create(
        [
          {
            ...stored({ ...rest, slugHistory: [] }),
            _id: oid(id),
            slugHistory: [],
            status: "draft",
            live: false,
            publishedAt: null,
            revision: 1,
            schemaVersion: 1,
          },
        ],
        { session: sessionOf(tx) },
      );
      return toProduct(doc!.toObject<ProductDoc>());
    });
  }

  update(id: string, revision: number, changes: ProductUpdate, tx: TxContext) {
    return unique(async () => {
      const doc = await this.products
        .findOneAndUpdate(
          { _id: oid(id), revision },
          { $set: stored(changes), $inc: { revision: 1 } },
          { new: true, session: sessionOf(tx) },
        )
        .lean<ProductDoc>()
        .exec();
      return doc ? toProduct(doc) : null;
    });
  }

  async setStatus(
    id: string,
    revision: number,
    status: ProductStatus,
    publishedAt: Date | null,
    tx: TxContext,
  ) {
    const doc = await this.products
      .findOneAndUpdate(
        { _id: oid(id), revision },
        { $set: { status, live: isLive(status), publishedAt }, $inc: { revision: 1 } },
        { new: true, session: sessionOf(tx) },
      )
      .lean<ProductDoc>()
      .exec();
    return doc ? toProduct(doc) : null;
  }

  async approveImpact(id: string, revision: number, by: string, at: Date, tx: TxContext) {
    const doc = await this.products
      .findOneAndUpdate(
        { _id: oid(id), revision, "impact.status": "pending" },
        {
          $set: { "impact.status": "approved", "impact.approvedBy": by, "impact.approvedAt": at },
          $inc: { revision: 1 },
        },
        { new: true, session: sessionOf(tx) },
      )
      .lean<ProductDoc>()
      .exec();
    return doc ? toProduct(doc) : null;
  }

  async list(query: ProductListQuery) {
    const filter: FilterQuery<ProductDoc> = {};
    filter.status = query.status ?? { $ne: "archived" };
    if (query.categoryId) filter.categoryId = oid(query.categoryId);
    if (query.partnerBrandId) filter.partnerBrandId = oid(query.partnerBrandId);
    if (query.stock) filter._id = { $in: (await this.idsWithStock(query.stock)).map(oid) };
    if (query.q) {
      const key = escapeRegex(toSearchKey(query.q));
      const ids = await this.variants
        .find(
          { sku: new RegExp(`^${escapeRegex(query.q.trim().toUpperCase())}`) },
          { productId: 1 },
        )
        .lean<{ productId: Types.ObjectId }[]>()
        .exec();
      filter.$or = [
        { "search.key": new RegExp(key) },
        { slug: new RegExp(escapeRegex(query.q.trim().toLowerCase())) },
        { _id: { $in: ids.map((v) => v.productId) } },
      ];
    }
    return this.page(filter, { updatedAt: -1, _id: -1 }, query.cursor, query.limit);
  }

  listPublic(query: PublicProductQuery) {
    const filter: FilterQuery<ProductDoc> = { live: true };
    if (query.categoryId) filter.categoryId = oid(query.categoryId);
    if (query.partnerBrandId) filter.partnerBrandId = oid(query.partnerBrandId);
    if (query.q) filter["search.key"] = new RegExp(escapeRegex(toSearchKey(query.q)));
    return this.page(filter, PUBLIC_SORT[query.sort], query.cursor, query.limit);
  }

  async idsWithStock(state: "low" | "out") {
    const available = { $subtract: ["$stock.onHand", "$stock.held"] };
    const condition =
      state === "out"
        ? { $lte: [available, 0] }
        : { $and: [{ $gt: [available, 0] }, { $lte: [available, "$lowStockThreshold"] }] };
    const rows = await this.variants
      .aggregate<{ _id: Types.ObjectId }>([
        { $match: { status: "active", $expr: condition } },
        { $group: { _id: "$productId" } },
      ])
      .exec();
    return rows.map((row) => row._id.toHexString());
  }

  async variantsOf(productIds: readonly string[]) {
    const result = new Map<string, VariantRecord[]>();
    if (productIds.length === 0) return result;
    const docs = await this.variants
      .find({ productId: { $in: productIds.map(oid) } })
      .sort({ sortOrder: 1 })
      .lean<VariantDoc[]>()
      .exec();
    for (const doc of docs) {
      const variant = toVariant(doc);
      result.set(variant.productId, [...(result.get(variant.productId) ?? []), variant]);
    }
    return result;
  }

  async findVariant(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.variants.findById(oid(id)).lean<VariantDoc>().exec();
    return doc ? toVariant(doc) : null;
  }

  async findVariantsBySku(skus: readonly string[]) {
    const docs = await this.variants
      .find({ sku: { $in: [...skus] } })
      .lean<VariantDoc[]>()
      .exec();
    return docs.map(toVariant);
  }

  writeVariants(
    productId: string,
    writes: readonly { write: VariantWrite; isNew: boolean; initialStock: number }[],
    tx: TxContext,
  ) {
    return unique(async () => {
      const session = sessionOf(tx);
      // Archive first, then write: a combination freed by this edit can be reused at once.
      for (const { write } of writes.filter((w) => !w.isNew && w.write.status === "archived")) {
        await this.variants.updateOne(
          { _id: oid(write.id) },
          { $set: { status: "archived" } },
          { session },
        );
      }
      for (const { write, isNew, initialStock } of writes) {
        const { id, ...fields } = write;
        if (isNew) {
          await this.variants.create(
            [
              {
                ...fields,
                _id: oid(id),
                productId: oid(productId),
                stock: { onHand: initialStock, held: 0, sold: 0 },
                schemaVersion: 1,
              },
            ],
            { session },
          );
        } else {
          await this.variants.updateOne(
            { _id: oid(id), productId: oid(productId) },
            { $set: fields },
            { session },
          );
        }
      }
    });
  }

  async archiveVariants(ids: readonly string[], tx: TxContext) {
    if (ids.length === 0) return;
    await this.variants.updateMany(
      { _id: { $in: ids.map(oid) } },
      { $set: { status: "archived" } },
      { session: sessionOf(tx) },
    );
  }

  async adjustStock(variantId: string, mode: "add" | "set", quantity: number, tx: TxContext) {
    const session = sessionOf(tx);
    const before = await this.variants
      .findById(oid(variantId))
      .session(session ?? null)
      .lean<VariantDoc>()
      .exec();
    if (!before) return null;
    const delta = mode === "set" ? quantity - before.stock.onHand : quantity;
    // BR-22: never below what pending orders hold, never below zero.
    const doc = await this.variants
      .findOneAndUpdate(
        {
          _id: oid(variantId),
          "stock.onHand": before.stock.onHand,
          $expr: { $gte: [{ $add: ["$stock.onHand", delta] }, "$stock.held"] },
        },
        { $inc: { "stock.onHand": delta } },
        { new: true, session },
      )
      .lean<VariantDoc>()
      .exec();
    if (!doc || doc.stock.onHand < 0) return null;
    return { variant: toVariant(doc), delta };
  }

  async insertMovement(movement: Omit<StockMovementRecord, "id">, tx: TxContext) {
    await this.movements.create(
      [
        {
          ...movement,
          variantId: oid(movement.variantId),
          productId: oid(movement.productId),
          orderId: movement.orderId ? oid(movement.orderId) : null,
          importJobId: movement.importJobId ? oid(movement.importJobId) : null,
          schemaVersion: 1,
        },
      ],
      { session: sessionOf(tx) },
    );
  }

  async listMovements(variantId: string, limit: number) {
    const docs = await this.movements
      .find({ variantId: oid(variantId) })
      .sort({ at: -1 })
      .limit(limit)
      .lean<MovementDoc[]>()
      .exec();
    return docs.map((doc) => ({
      id: doc._id.toHexString(),
      variantId: doc.variantId.toHexString(),
      productId: doc.productId.toHexString(),
      type: doc.type,
      delta: doc.delta,
      reason: doc.reason ?? "",
      orderId: doc.orderId ? doc.orderId.toHexString() : null,
      importJobId: doc.importJobId ? doc.importJobId.toHexString() : null,
      actorId: doc.actorId ?? null,
      at: doc.at,
    }));
  }

  private async page(
    filter: FilterQuery<ProductDoc>,
    sort: Record<string, SortOrder>,
    cursor: string | undefined,
    limit: number,
  ) {
    const offset = decodeOffset(cursor);
    const docs = await this.products
      .find(filter)
      .sort(sort)
      .skip(offset)
      .limit(limit + 1)
      .lean<ProductDoc[]>()
      .exec();
    const items = docs.slice(0, limit).map(toProduct);
    return { items, nextCursor: docs.length > limit ? encodeOffset(offset + limit) : null };
  }
}
