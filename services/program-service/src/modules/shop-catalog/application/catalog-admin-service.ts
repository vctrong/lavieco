import type { OutboxPort, TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError, toSlug } from "@lavieco/shared";
import {
  SHOP_CACHE_TAGS,
  type PartnerBrandUpsertRequest,
  type ProductCategoryCreateRequest,
  type ProductCategoryUpdateRequest,
  type ShopSettingsUpdateRequest,
} from "@lavieco/shared/shop";

import type { AuditTrail } from "../../audit";
import type { CategoryRecord } from "../domain/catalog";
import type { CatalogRepository } from "./ports";
import { uniqueGuard, type ShopActor } from "./product-admin-service";
import { queueShopTags } from "./shop-jobs";

/**
 * Categories, partner brands (BR-25) and shop settings (delivery fee, COD limit...),
 * for staff with `product:write`. Every change is audited without personal data.
 */
export class CatalogAdminService {
  constructor(
    private readonly catalog: CatalogRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly audit: AuditTrail,
  ) {}

  categories() {
    return this.catalog.listCategories(true);
  }

  async createCategory(input: ProductCategoryCreateRequest, actor: ShopActor, now = new Date()) {
    const key = toSlug(input.name, 60);
    if (!key) throw new DomainError("common.validation_failed");
    const existing = await this.catalog.listCategories(true);
    const record: Omit<CategoryRecord, "revision"> = {
      id: this.catalog.newId(),
      key,
      name: input.name,
      description: input.description,
      sortOrder: existing.length,
      archivedAt: null,
    };
    return uniqueGuard(() =>
      this.unitOfWork.run(async (tx) => {
        const saved = await this.catalog.insertCategory(record, tx);
        await this.log("shop.category", "product_category", saved.id, actor, now, tx);
        await this.refreshCategories(tx);
        return saved;
      }),
    );
  }

  async updateCategory(
    id: string,
    input: ProductCategoryUpdateRequest,
    actor: ShopActor,
    now = new Date(),
  ) {
    const current = await this.catalog.findCategory(id);
    if (!current) throw new DomainError("common.not_found");
    return uniqueGuard(() =>
      this.unitOfWork.run(async (tx) => {
        const saved = await this.catalog.updateCategory(
          id,
          input.revision,
          {
            name: input.name,
            description: input.description,
            sortOrder: input.sortOrder,
            archivedAt: input.archived ? (current.archivedAt ?? now) : null,
          },
          tx,
        );
        if (!saved) throw new DomainError("common.conflict");
        await this.log("shop.category", "product_category", id, actor, now, tx);
        await this.refreshCategories(tx);
        return saved;
      }),
    );
  }

  brands() {
    return this.catalog.listBrands();
  }

  async upsertBrand(
    id: string | null,
    input: PartnerBrandUpsertRequest,
    actor: ShopActor,
    now = new Date(),
  ) {
    const fields = {
      slug: input.slug,
      name: input.name,
      story: input.story,
      website: input.website,
      logo: null,
      commissionRate: input.commissionRate,
      active: input.active,
    };
    return uniqueGuard(() =>
      this.unitOfWork.run(async (tx) => {
        let saved;
        if (id === null) {
          saved = await this.catalog.insertBrand({ id: this.catalog.newId(), ...fields }, tx);
        } else {
          const current = await this.catalog.findBrand(id);
          if (!current) throw new DomainError("common.not_found");
          if (!input.revision) throw new DomainError("common.validation_failed");
          saved = await this.catalog.updateBrand(
            id,
            input.revision,
            { ...fields, logo: current.logo },
            tx,
          );
          if (!saved) throw new DomainError("common.conflict");
        }
        await this.log("shop.brand", "partner_brand", saved.id, actor, now, tx);
        // Product pages show the brand name: drop the whole shop cache.
        await queueShopTags(this.outbox, tx, [SHOP_CACHE_TAGS.products]);
        return saved;
      }),
    );
  }

  settings() {
    return this.catalog.getSettings();
  }

  async saveSettings(input: ShopSettingsUpdateRequest, actor: ShopActor, now = new Date()) {
    const { revision, ...values } = input;
    return this.unitOfWork.run(async (tx) => {
      const saved = await this.catalog.saveSettings(revision, values, tx);
      if (!saved) throw new DomainError("common.conflict");
      await this.log("shop.settings", "shop_settings", "settings", actor, now, tx);
      return saved;
    });
  }

  private refreshCategories(tx: TxContext) {
    return queueShopTags(this.outbox, tx, [SHOP_CACHE_TAGS.categories, SHOP_CACHE_TAGS.products]);
  }

  private log(
    action: "shop.category" | "shop.brand" | "shop.settings",
    type: string,
    id: string,
    actor: ShopActor,
    now: Date,
    tx: TxContext,
  ) {
    return this.audit.record(
      tx,
      {
        action,
        actor: { userId: actor.userId, roles: actor.roles },
        target: { type, id },
        requestId: actor.requestId,
        meta: {},
      },
      now,
    );
  }
}
