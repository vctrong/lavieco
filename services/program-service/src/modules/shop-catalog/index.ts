export { ShopCatalogModule } from "./shop-catalog.module";
export {
  CATALOG_REPOSITORY,
  PRODUCT_MEDIA,
  PRODUCT_REPOSITORY,
  UniqueKeyTakenError,
  type CatalogRepository,
  type ProductMedia,
  type ProductRepository,
} from "./application/ports";
export {
  RELEASE_PRODUCT_MEDIA_JOB,
  REVALIDATE_PRODUCT_JOB,
  REVALIDATE_SHOP_TAGS_JOB,
} from "./application/shop-jobs";
export {
  available,
  availabilityOf,
  type ProductRecord,
  type VariantRecord,
} from "./domain/product";
export type { ShopSettingsRecord } from "./domain/catalog";
