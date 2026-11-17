import { type DynamicModule, Module } from "@nestjs/common";

import { UNIT_OF_WORK } from "@lavieco/service-kit";
import type { UnitOfWork } from "@lavieco/service-kit/ports";

import { AUDIT_TRAIL, type AuditTrail } from "../audit";
import { ExcelWorkbookWriter } from "../registrations";
import {
  CATALOG_REPOSITORY,
  PRODUCT_ADMIN_SERVICE,
  PRODUCT_REPOSITORY,
  type CatalogRepository,
  type ProductAdminService,
  type ProductRepository,
} from "../shop-catalog";
import { ImportsController } from "./api/imports.controller";
import {
  IMPORT_JOB_REPOSITORY,
  ImportService,
  SPREADSHEET_READER,
  type ImportJobRepository,
  type SpreadsheetReader,
} from "./application/import-service";
import { ExcelSpreadsheetReader } from "./infrastructure/excel-reader";
import {
  MongoImportJobRepository,
  importJobPersistence,
} from "./infrastructure/import-job.repository";
import { IMPORT_SERVICE } from "./shop-imports.tokens";

/** Bulk import / export of products (UC-39). Saves through the shop-catalog use cases. */
@Module({})
export class ShopImportsModule {
  static forRoot(shopCatalog: DynamicModule): DynamicModule {
    return {
      module: ShopImportsModule,
      imports: [importJobPersistence, shopCatalog],
      controllers: [ImportsController],
      providers: [
        { provide: IMPORT_JOB_REPOSITORY, useClass: MongoImportJobRepository },
        { provide: SPREADSHEET_READER, useClass: ExcelSpreadsheetReader },
        {
          provide: IMPORT_SERVICE,
          useFactory: (
            jobs: ImportJobRepository,
            reader: SpreadsheetReader,
            catalog: CatalogRepository,
            products: ProductRepository,
            productAdmin: ProductAdminService,
            audit: AuditTrail,
            unitOfWork: UnitOfWork,
          ) =>
            new ImportService(
              jobs,
              reader,
              catalog,
              products,
              productAdmin,
              new ExcelWorkbookWriter(),
              audit,
              unitOfWork,
            ),
          inject: [
            IMPORT_JOB_REPOSITORY,
            SPREADSHEET_READER,
            CATALOG_REPOSITORY,
            PRODUCT_REPOSITORY,
            PRODUCT_ADMIN_SERVICE,
            AUDIT_TRAIL,
            UNIT_OF_WORK,
          ],
        },
      ],
    };
  }
}
