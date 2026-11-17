import type { PublicProductListQuery } from "@lavieco/shared/shop";

import type { BrandRecord, CategoryRecord } from "../domain/catalog";
import { isLive, type ProductRecord, type VariantRecord } from "../domain/product";
import type { CatalogRepository, ProductRepository } from "./ports";

export type PublicProductBundle = {
  product: ProductRecord;
  variants: VariantRecord[];
  category: CategoryRecord;
  brand: BrandRecord | null;
};

/**
 * What `web` may read (S3): published products only, never drafts, stock counts beyond
 * "Còn N", or commission rates (BR-25). Unknown category or brand filters give nothing.
 */
export class CatalogPublicService {
  constructor(
    private readonly catalog: CatalogRepository,
    private readonly products: ProductRepository,
  ) {}

  async categories() {
    return this.catalog.listCategories(false);
  }

  async list(query: PublicProductListQuery) {
    const [category, brand] = await Promise.all([
      query.category ? this.catalog.findCategoryByKey(query.category) : null,
      query.brand ? this.catalog.findBrandBySlug(query.brand) : null,
    ]);
    if ((query.category && (!category || category.archivedAt)) || (query.brand && !brand?.active)) {
      return { items: [], nextCursor: null };
    }
    const page = await this.products.listPublic({
      categoryId: category?.id,
      partnerBrandId: brand?.id,
      q: query.q,
      sort: query.sort,
      cursor: query.cursor,
      limit: query.limit,
    });
    return { items: await this.bundles(page.items), nextCursor: page.nextCursor };
  }

  /** By current or former slug; the caller redirects when `product.slug` differs. */
  async get(slug: string): Promise<PublicProductBundle | null> {
    const product = await this.products.findBySlug(slug);
    if (!product || !isLive(product.status)) return null;
    const [bundle] = await this.bundles([product]);
    return bundle ?? null;
  }

  private async bundles(products: readonly ProductRecord[]): Promise<PublicProductBundle[]> {
    const [variants, categories, brands] = await Promise.all([
      this.products.variantsOf(products.map((p) => p.id)),
      this.catalog.listCategories(true),
      this.catalog.listBrands(),
    ]);
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const brandById = new Map(brands.map((b) => [b.id, b]));
    return products.flatMap((product) => {
      const category = categoryById.get(product.categoryId);
      if (!category) return [];
      const brand = product.partnerBrandId ? (brandById.get(product.partnerBrandId) ?? null) : null;
      const active = (variants.get(product.id) ?? []).filter((v) => v.status === "active");
      return [{ product, variants: active, category, brand: brand?.active ? brand : null }];
    });
  }
}
