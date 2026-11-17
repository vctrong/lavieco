import { type DynamicModule, Module } from "@nestjs/common";

import { OUTBOX_PORT, SERVICE_CONFIG, UNIT_OF_WORK } from "@lavieco/service-kit";
import type { OutboxPort, UnitOfWork } from "@lavieco/service-kit/ports";

import type { ProgramEnv } from "../../config/env";
import { AUDIT_TRAIL, type AuditTrail } from "../audit";
import { CatalogAdminController } from "./api/catalog-admin.controller";
import { CatalogPublicController } from "./api/catalog-public.controller";
import { CatalogAdminService } from "./application/catalog-admin-service";
import { CatalogPublicService } from "./application/catalog-public-service";
import {
  CATALOG_REPOSITORY,
  PRODUCT_MEDIA,
  PRODUCT_REPOSITORY,
  type CatalogRepository,
  type ProductMedia,
  type ProductRepository,
} from "./application/ports";
import { ProductAdminService } from "./application/product-admin-service";
import { catalogPersistence } from "./infrastructure/catalog.models";
import { MongoCatalogRepository } from "./infrastructure/catalog.repository";
import { createContentProductMedia } from "./infrastructure/content-product-media";
import { MongoProductRepository } from "./infrastructure/product.repository";
import {
  CATALOG_ADMIN_SERVICE,
  CATALOG_PUBLIC_SERVICE,
  PRODUCT_ADMIN_SERVICE,
} from "./shop-catalog.tokens";

/** Shop catalogue (ADR-0028): categories, partner brands, products, variants, stock, settings. */
@Module({})
export class ShopCatalogModule {
  /** `productMedia` lets tests replace content-service with a fake. */
  static forRoot(productMedia?: ProductMedia): DynamicModule {
    return {
      module: ShopCatalogModule,
      imports: [catalogPersistence],
      controllers: [CatalogAdminController, CatalogPublicController],
      providers: [
        { provide: CATALOG_REPOSITORY, useClass: MongoCatalogRepository },
        { provide: PRODUCT_REPOSITORY, useClass: MongoProductRepository },
        productMedia
          ? { provide: PRODUCT_MEDIA, useValue: productMedia }
          : {
              provide: PRODUCT_MEDIA,
              useFactory: (env: ProgramEnv) =>
                createContentProductMedia({
                  contentServiceUrl: env.CONTENT_SERVICE_URL,
                  privateJwk: env.SERVICE_TOKEN_PRIVATE_JWK,
                }),
              inject: [SERVICE_CONFIG],
            },
        {
          provide: PRODUCT_ADMIN_SERVICE,
          useFactory: (
            products: ProductRepository,
            catalog: CatalogRepository,
            media: ProductMedia,
            unitOfWork: UnitOfWork,
            outbox: OutboxPort,
            audit: AuditTrail,
          ) => new ProductAdminService(products, catalog, media, unitOfWork, outbox, audit),
          inject: [
            PRODUCT_REPOSITORY,
            CATALOG_REPOSITORY,
            PRODUCT_MEDIA,
            UNIT_OF_WORK,
            OUTBOX_PORT,
            AUDIT_TRAIL,
          ],
        },
        {
          provide: CATALOG_ADMIN_SERVICE,
          useFactory: (
            catalog: CatalogRepository,
            unitOfWork: UnitOfWork,
            outbox: OutboxPort,
            audit: AuditTrail,
          ) => new CatalogAdminService(catalog, unitOfWork, outbox, audit),
          inject: [CATALOG_REPOSITORY, UNIT_OF_WORK, OUTBOX_PORT, AUDIT_TRAIL],
        },
        {
          provide: CATALOG_PUBLIC_SERVICE,
          useFactory: (catalog: CatalogRepository, products: ProductRepository) =>
            new CatalogPublicService(catalog, products),
          inject: [CATALOG_REPOSITORY, PRODUCT_REPOSITORY],
        },
      ],
      exports: [PRODUCT_REPOSITORY, CATALOG_REPOSITORY, PRODUCT_MEDIA, PRODUCT_ADMIN_SERVICE],
    };
  }
}
