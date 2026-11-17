import type { TxContext } from "@lavieco/service-kit/ports";
import type {
  ProductListQuery,
  ProductStatus,
  PublicProductSort,
  ShopSettingsInput,
} from "@lavieco/shared/shop";

import type {
  BrandRecord,
  CategoryRecord,
  ShopSettingsRecord,
  StockMovementRecord,
} from "../domain/catalog";
import type {
  ProductChanges,
  ProductImageRecord,
  ProductRecord,
  VariantRecord,
} from "../domain/product";

export const CATALOG_REPOSITORY = Symbol("CATALOG_REPOSITORY");
export const PRODUCT_REPOSITORY = Symbol("PRODUCT_REPOSITORY");
export const PRODUCT_MEDIA = Symbol("PRODUCT_MEDIA");

/** A unique key (product slug, SKU, category name, brand slug) is already taken. */
export class UniqueKeyTakenError extends Error {
  override name = "UniqueKeyTakenError";
  constructor(readonly key: "slug" | "sku" | "category" | "brand") {
    super(key);
  }
}

/** Categories, partner brands and the shop settings document. */
export interface CatalogRepository {
  newId(): string;
  listCategories(includeArchived: boolean): Promise<CategoryRecord[]>;
  findCategory(id: string): Promise<CategoryRecord | null>;
  findCategoryByKey(key: string): Promise<CategoryRecord | null>;
  insertCategory(record: Omit<CategoryRecord, "revision">, tx?: TxContext): Promise<CategoryRecord>;
  updateCategory(
    id: string,
    revision: number,
    changes: Pick<CategoryRecord, "name" | "description" | "sortOrder" | "archivedAt">,
    tx?: TxContext,
  ): Promise<CategoryRecord | null>;

  listBrands(): Promise<BrandRecord[]>;
  findBrand(id: string): Promise<BrandRecord | null>;
  findBrandBySlug(slug: string): Promise<BrandRecord | null>;
  insertBrand(record: Omit<BrandRecord, "revision">, tx?: TxContext): Promise<BrandRecord>;
  updateBrand(
    id: string,
    revision: number,
    changes: Omit<BrandRecord, "id" | "revision">,
    tx?: TxContext,
  ): Promise<BrandRecord | null>;

  /** The single settings document; defaults (docs/08) until someone saves it. */
  getSettings(): Promise<ShopSettingsRecord>;
  saveSettings(
    revision: number,
    input: ShopSettingsInput,
    tx?: TxContext,
  ): Promise<ShopSettingsRecord | null>;
}

export type PublicProductQuery = {
  categoryId?: string;
  partnerBrandId?: string;
  q?: string;
  sort: PublicProductSort;
  cursor?: string;
  limit: number;
};

export type ProductInsert = ProductChanges & {
  id: string;
  images: ProductImageRecord[];
  impact: ProductRecord["impact"];
  priceMin: number;
  priceMax: number;
};

export type ProductUpdate = ProductChanges & {
  images: ProductImageRecord[];
  impact: ProductRecord["impact"];
  priceMin: number;
  priceMax: number;
  slugHistory: string[];
};

export type VariantWrite = Omit<
  VariantRecord,
  "id" | "productId" | "stock" | "createdAt" | "updatedAt"
> & { id: string };

/** Products and their variants (one collection each) plus the append-only stock ledger. */
export interface ProductRepository {
  newId(): string;
  findById(id: string): Promise<ProductRecord | null>;
  /** By current slug or a former one (`slugHistory`), so old links keep working. */
  findBySlug(slug: string): Promise<ProductRecord | null>;
  insert(product: ProductInsert, tx: TxContext): Promise<ProductRecord>;
  update(
    id: string,
    revision: number,
    changes: ProductUpdate,
    tx: TxContext,
  ): Promise<ProductRecord | null>;
  setStatus(
    id: string,
    revision: number,
    status: ProductStatus,
    publishedAt: Date | null,
    tx: TxContext,
  ): Promise<ProductRecord | null>;
  approveImpact(
    id: string,
    revision: number,
    by: string,
    at: Date,
    tx: TxContext,
  ): Promise<ProductRecord | null>;
  list(query: ProductListQuery): Promise<{ items: ProductRecord[]; nextCursor: string | null }>;
  listPublic(
    query: PublicProductQuery,
  ): Promise<{ items: ProductRecord[]; nextCursor: string | null }>;
  /** Product ids whose active variants are low (`available ≤ threshold`) or out. */
  idsWithStock(state: "low" | "out"): Promise<string[]>;

  variantsOf(productIds: readonly string[]): Promise<Map<string, VariantRecord[]>>;
  findVariant(id: string): Promise<VariantRecord | null>;
  findVariantsBySku(skus: readonly string[]): Promise<VariantRecord[]>;
  findVariants(ids: readonly string[]): Promise<VariantRecord[]>;
  findByIds(ids: readonly string[]): Promise<ProductRecord[]>;
  /** Inserts new variants (with their opening stock) and updates the given fields of the others. */
  writeVariants(
    productId: string,
    writes: readonly { write: VariantWrite; isNew: boolean; initialStock: number }[],
    tx: TxContext,
  ): Promise<void>;
  archiveVariants(ids: readonly string[], tx: TxContext): Promise<void>;
  /**
   * `add`: `onHand += quantity`; `set`: `onHand = quantity`. Refused (null) when the result
   * would go below what pending orders hold (BR-22) or below zero.
   */
  adjustStock(
    variantId: string,
    mode: "add" | "set",
    quantity: number,
    tx: TxContext,
  ): Promise<{ variant: VariantRecord; delta: number } | null>;
  insertMovement(movement: Omit<StockMovementRecord, "id">, tx: TxContext): Promise<void>;
  /** BR-22: `held += n` only if `onHand - held >= n`. */
  reserveStock(variantId: string, quantity: number, tx: TxContext): Promise<boolean>;
  /** Paid or confirmed: `held -= n`, `onHand -= n`, `sold += n`. */
  commitStock(variantId: string, quantity: number, tx: TxContext): Promise<void>;
  /** Expired or cancelled before commit: `held -= n`. */
  releaseStock(variantId: string, quantity: number, tx: TxContext): Promise<void>;
  /** Cancelled or returned after commit, back on the shelf: `onHand += n`, `sold -= n`. */
  restock(variantId: string, quantity: number, tx: TxContext): Promise<void>;
  /** A late payment for released goods: take them again if still there (`onHand -= n`). */
  takeAgain(variantId: string, quantity: number, tx: TxContext): Promise<boolean>;
  listMovements(variantId: string, limit: number): Promise<StockMovementRecord[]>;
}

export type ImageFile = { publicId: string; width: number; height: number };

/** content-service's side of product images (ADR-0020, ADR-0028); faked in tests. */
export interface ProductMedia {
  attach(mediaId: string, productId: string): Promise<ImageFile>;
  release(mediaId: string, productId: string): Promise<void>;
}
