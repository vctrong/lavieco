import type { OutboxPort, TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import type {
  ProductCreateRequest,
  ProductImageInput,
  ProductListQuery,
  ProductStatusRequest,
  ProductUpdateRequest,
  StockAdjustRequest,
} from "@lavieco/shared/shop";
import type { Role } from "@lavieco/shared/permissions";

import type { AuditTrail, ProgramAuditAction } from "../../audit";
import {
  assertImages,
  assertVariants,
  isLive,
  nextImpact,
  optionKeyOf,
  priceRange,
  publishBlockers,
  toProductChanges,
  type ProductImageRecord,
  type ProductRecord,
  type VariantRecord,
} from "../domain/product";
import {
  UniqueKeyTakenError,
  type CatalogRepository,
  type ImageFile,
  type ProductMedia,
  type ProductRepository,
  type VariantWrite,
} from "./ports";
import { queueProductMediaRelease, queueProductRevalidation } from "./shop-jobs";

export type ShopActor = { userId: string; roles: readonly Role[]; requestId: string | null };

export type ProductBundle = { product: ProductRecord; variants: VariantRecord[] };

const SLUG_HISTORY_MAX = 20;

/** Translates repository key clashes into the API's error codes. */
export async function uniqueGuard<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof UniqueKeyTakenError) {
      const code = {
        slug: "product.slug_taken",
        sku: "product.sku_taken",
        category: "category.name_taken",
        brand: "brand.slug_taken",
      } as const;
      throw new DomainError(code[error.key]);
    }
    throw error;
  }
}

/**
 * Products of the shop (UC-38, ADR-0028), for staff with `product:*`. Products publish
 * themselves (like events, BR-17) once BR-20 holds; impact figures wait for
 * `impact:approve` (BR-23). Images are attached in content-service before the
 * transaction (no external call inside one, S5) and released through the outbox.
 */
export class ProductAdminService {
  constructor(
    private readonly products: ProductRepository,
    private readonly catalog: CatalogRepository,
    private readonly media: ProductMedia,
    private readonly unitOfWork: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly audit: AuditTrail,
  ) {}

  list(query: ProductListQuery) {
    return this.listWithVariants(query);
  }

  async get(id: string): Promise<ProductBundle> {
    const product = await this.products.findById(id);
    if (!product) throw new DomainError("common.not_found");
    const variants = (await this.products.variantsOf([id])).get(id) ?? [];
    return { product, variants };
  }

  async create(input: ProductCreateRequest, actor: ShopActor, now = new Date()) {
    await this.validate(input);
    const id = this.products.newId();
    const images = await this.resolveImages(id, [], input.images);
    const changes = toProductChanges(input);
    const writes = this.variantWrites(input, []);
    const range = priceRange(writes.map(({ write }) => write));
    return uniqueGuard(() =>
      this.unitOfWork.run(async (tx) => {
        const product = await this.products.insert(
          { ...changes, id, images, impact: nextImpact(null, input.impactItems), ...range },
          tx,
        );
        await this.products.writeVariants(id, writes, tx);
        await this.openingStock(id, writes, actor, now, tx);
        await this.record("product.create", product, actor, now, tx);
        return this.bundle(product);
      }),
    );
  }

  async update(id: string, input: ProductUpdateRequest, actor: ShopActor, now = new Date()) {
    const current = await this.get(id);
    await this.validate(input);
    const writes = this.variantWrites(input, current.variants);
    const kept = new Set(writes.filter((w) => !w.isNew).map((w) => w.write.id));
    const dropped = current.variants.filter((v) => v.status === "active" && !kept.has(v.id));
    const range = priceRange(writes.map(({ write }) => write));
    const images = await this.resolveImages(id, current.product.images, input.images);
    // A published product must keep satisfying BR-20 after the edit.
    if (isLive(current.product.status)) {
      const blockers = publishBlockers(
        { images, story: input.story, handbookLink: input.handbookLink },
        writes.map(({ write }) => write),
      );
      if (blockers.length > 0) {
        throw new DomainError("product.publish_blocked", undefined, {
          blockers: blockers.join(","),
        });
      }
    }
    const slugHistory =
      input.slug === current.product.slug
        ? current.product.slugHistory
        : [
            current.product.slug,
            ...current.product.slugHistory.filter((s) => s !== input.slug),
          ].slice(0, SLUG_HISTORY_MAX);
    const removedMedia = current.product.images
      .map((image) => image.mediaId)
      .filter((mediaId) => !images.some((image) => image.mediaId === mediaId));

    return uniqueGuard(() =>
      this.unitOfWork.run(async (tx) => {
        const saved = await this.products.update(
          id,
          input.revision,
          {
            ...toProductChanges(input),
            images,
            impact: nextImpact(current.product.impact, input.impactItems),
            slugHistory,
            ...range,
          },
          tx,
        );
        if (!saved) throw new DomainError("common.conflict");
        await this.products.writeVariants(id, writes, tx);
        await this.products.archiveVariants(
          dropped.map((v) => v.id),
          tx,
        );
        await this.openingStock(id, writes, actor, now, tx);
        await queueProductMediaRelease(this.outbox, tx, id, removedMedia);
        if (isLive(saved.status)) {
          await queueProductRevalidation(this.outbox, tx, [saved.slug, current.product.slug]);
        }
        await this.record("product.update", saved, actor, now, tx);
        return this.bundle(saved);
      }),
    );
  }

  async setStatus(id: string, input: ProductStatusRequest, actor: ShopActor, now = new Date()) {
    const current = await this.get(id);
    if (input.status === "published") {
      const blockers = publishBlockers(current.product, current.variants);
      if (blockers.length > 0) {
        throw new DomainError("product.publish_blocked", undefined, {
          blockers: blockers.join(","),
        });
      }
    }
    const publishedAt =
      input.status === "published"
        ? (current.product.publishedAt ?? now)
        : current.product.publishedAt;
    return this.unitOfWork.run(async (tx) => {
      const saved = await this.products.setStatus(
        id,
        input.revision,
        input.status,
        publishedAt,
        tx,
      );
      if (!saved) throw new DomainError("common.conflict");
      if (isLive(saved.status) || isLive(current.product.status)) {
        await queueProductRevalidation(this.outbox, tx, [saved.slug]);
      }
      await this.record("product.status", saved, actor, now, tx);
      return this.bundle(saved);
    });
  }

  /** BR-23 (`impact:approve`, checked by the controller). */
  async approveImpact(id: string, revision: number, actor: ShopActor, now = new Date()) {
    const current = await this.get(id);
    if (current.product.impact.status !== "pending") throw new DomainError("common.conflict");
    return this.unitOfWork.run(async (tx) => {
      const saved = await this.products.approveImpact(id, revision, actor.userId, now, tx);
      if (!saved) throw new DomainError("common.conflict");
      if (isLive(saved.status)) await queueProductRevalidation(this.outbox, tx, [saved.slug]);
      await this.record("product.impact_approve", saved, actor, now, tx);
      return this.bundle(saved);
    });
  }

  async adjustStock(
    variantId: string,
    input: StockAdjustRequest,
    actor: ShopActor,
    now = new Date(),
  ) {
    const variant = await this.products.findVariant(variantId);
    if (!variant) throw new DomainError("common.not_found");
    const product = await this.products.findById(variant.productId);
    if (!product) throw new DomainError("common.not_found");
    return this.unitOfWork.run(async (tx) => {
      const result = await this.products.adjustStock(variantId, input.mode, input.quantity, tx);
      if (!result) throw new DomainError("product.stock_below_held");
      if (result.delta !== 0) {
        await this.products.insertMovement(
          {
            variantId,
            productId: product.id,
            type: input.mode === "set" ? "adjust" : input.quantity >= 0 ? "receive" : "adjust",
            delta: result.delta,
            reason: input.reason,
            orderId: null,
            importJobId: null,
            actorId: actor.userId,
            at: now,
          },
          tx,
        );
      }
      if (isLive(product.status)) await queueProductRevalidation(this.outbox, tx, [product.slug]);
      await this.audit.record(
        tx,
        {
          action: "product.stock_adjust",
          actor: { userId: actor.userId, roles: actor.roles },
          target: { type: "product_variant", id: variantId },
          requestId: actor.requestId,
          meta: { sku: variant.sku, delta: result.delta },
        },
        now,
      );
      return result.variant;
    });
  }

  movements(variantId: string) {
    return this.products.listMovements(variantId, 100);
  }

  // ------------------------------------------------------------------ helpers

  private async listWithVariants(query: ProductListQuery) {
    const page = await this.products.list(query);
    const variants = await this.products.variantsOf(page.items.map((p) => p.id));
    return {
      items: page.items.map((product) => ({ product, variants: variants.get(product.id) ?? [] })),
      nextCursor: page.nextCursor,
    };
  }

  private async bundle(product: ProductRecord): Promise<ProductBundle> {
    const variants = (await this.products.variantsOf([product.id])).get(product.id) ?? [];
    return { product, variants };
  }

  private async validate(input: ProductCreateRequest) {
    assertVariants(input.options, input.variants);
    assertImages(input.options, input.images);
    const [category, brand] = await Promise.all([
      this.catalog.findCategory(input.categoryId),
      input.partnerBrandId ? this.catalog.findBrand(input.partnerBrandId) : Promise.resolve(null),
    ]);
    if (!category || (input.partnerBrandId && !brand)) {
      throw new DomainError("product.category_unknown");
    }
  }

  /** Existing ids must belong to this product; a variant id never moves between products. */
  private variantWrites(input: ProductCreateRequest, current: readonly VariantRecord[]) {
    const byId = new Map(current.map((v) => [v.id, v]));
    return input.variants.map((variant, index) => {
      if (variant.id && !byId.has(variant.id)) throw new DomainError("product.variants_invalid");
      const write: VariantWrite = {
        id: variant.id ?? this.products.newId(),
        sku: variant.sku,
        optionKey: optionKeyOf(input.options, variant.optionValues),
        optionValues: variant.optionValues,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        lowStockThreshold: variant.lowStockThreshold,
        weightGrams: variant.weightGrams,
        status: variant.active ? "active" : "archived",
        madeToOrder: variant.madeToOrder,
        sortOrder: index,
      };
      // A made-to-order variant has no shelf: an initial count would mean nothing.
      const initialStock = variant.id || variant.madeToOrder ? 0 : variant.initialStock;
      return { write, isNew: !variant.id, initialStock };
    });
  }

  private async openingStock(
    productId: string,
    writes: readonly { write: VariantWrite; isNew: boolean; initialStock: number }[],
    actor: ShopActor,
    now: Date,
    tx: TxContext,
  ) {
    for (const { write, isNew, initialStock } of writes) {
      if (!isNew || initialStock === 0) continue;
      await this.products.insertMovement(
        {
          variantId: write.id,
          productId,
          type: "receive",
          delta: initialStock,
          reason: "Tồn kho ban đầu",
          orderId: null,
          importJobId: null,
          actorId: actor.userId,
          at: now,
        },
        tx,
      );
    }
  }

  /** Attaches the images the product does not hold yet; keeps the snapshot of the others. */
  private async resolveImages(
    productId: string,
    current: readonly ProductImageRecord[],
    input: readonly ProductImageInput[],
  ): Promise<ProductImageRecord[]> {
    const held = new Map(current.map((image) => [image.mediaId, image]));
    const files = new Map<string, ImageFile>();
    for (const image of input) {
      if (!held.has(image.mediaId))
        files.set(image.mediaId, await this.media.attach(image.mediaId, productId));
    }
    return input.map((image) => {
      const file = held.get(image.mediaId) ?? files.get(image.mediaId)!;
      return {
        mediaId: image.mediaId,
        publicId: file.publicId,
        width: file.width,
        height: file.height,
        alt: image.alt,
        variantValues: [...new Set(image.variantValues)],
      };
    });
  }

  private record(
    action: Extract<ProgramAuditAction, `product.${string}`>,
    product: ProductRecord,
    actor: ShopActor,
    now: Date,
    tx: TxContext,
  ) {
    return this.audit.record(
      tx,
      {
        action,
        actor: { userId: actor.userId, roles: actor.roles },
        target: { type: "product", id: product.id },
        requestId: actor.requestId,
        meta: { slug: product.slug, status: product.status },
      },
      now,
    );
  }
}
