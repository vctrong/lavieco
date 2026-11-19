import { type DynamicModule, Module } from "@nestjs/common";

import { OUTBOX_PORT, SERVICE_CONFIG, UNIT_OF_WORK } from "@lavieco/service-kit";
import type { OutboxPort, UnitOfWork } from "@lavieco/service-kit/ports";

import type { ProgramEnv } from "../../config/env";
import { AUDIT_TRAIL, type AuditTrail } from "../audit";
import { PriceListAdminController } from "./api/price-list-admin.controller";
import { SalesOrdersAdminController } from "./api/sales-orders-admin.controller";
import {
  PRICE_ITEM_REPOSITORY,
  SALES_ORDER_REPOSITORY,
  STAFF_DIRECTORY,
  type PriceItemRepository,
  type SalesOrderRepository,
  type StaffDirectory,
} from "./application/ports";
import { LegacyImportService } from "./application/legacy-import-service";
import { PriceListService } from "./application/price-list-service";
import { noSheetQueue, type SalesSheetQueue } from "./application/sales-jobs";
import { SalesOrderService } from "./application/sales-order-service";
import { SalesSheetSync, outboxSheetQueue } from "./application/sales-sheet-sync";
import { SalesWebOrderMirror } from "./application/web-order-mirror";
import { GoogleSheetWriter } from "./infrastructure/google-sheet-writer";
import { createIdentityStaffDirectory } from "./infrastructure/identity-staff-directory";
import { MongoPriceItemRepository } from "./infrastructure/price-item.repository";
import { MongoSalesOrderRepository } from "./infrastructure/sales-order.repository";
import { SalesSheetWorkers, type SalesSheetOptions } from "./infrastructure/sales-sheet-workers";
import { salesPersistence } from "./infrastructure/sales.models";
import {
  LEGACY_IMPORT_SERVICE,
  PRICE_LIST_SERVICE,
  SALES_ORDER_SERVICE,
  SALES_SHEET_OPTIONS,
  SALES_SHEET_QUEUE,
  SALES_SHEET_SYNC,
  WEB_ORDER_MIRROR,
} from "./sales-orders.tokens";

/** The Sheet sync is on only when its three variables are set (docs/06). */
const sheetOptionsOf = (env: ProgramEnv): SalesSheetOptions => ({
  enabled: Boolean(
    env.SALES_SHEET_ID && env.SALES_SHEET_SERVICE_ACCOUNT_EMAIL && env.SALES_SHEET_PRIVATE_KEY,
  ),
  intervalMinutes: env.SALES_SHEET_SYNC_MINUTES,
});

export type SalesOrdersOptions = {
  /** Tests stand in for identity-service. */
  staffDirectory?: StaffDirectory;
};

/** The team's order book and internal price list (ADR-0030). */
@Module({})
export class SalesOrdersModule {
  static forRoot(options: SalesOrdersOptions = {}): DynamicModule {
    return {
      module: SalesOrdersModule,
      imports: [salesPersistence],
      controllers: [SalesOrdersAdminController, PriceListAdminController],
      providers: [
        { provide: SALES_ORDER_REPOSITORY, useClass: MongoSalesOrderRepository },
        { provide: PRICE_ITEM_REPOSITORY, useClass: MongoPriceItemRepository },
        options.staffDirectory
          ? { provide: STAFF_DIRECTORY, useValue: options.staffDirectory }
          : {
              provide: STAFF_DIRECTORY,
              useFactory: (env: ProgramEnv) =>
                createIdentityStaffDirectory({
                  identityServiceUrl: env.IDENTITY_SERVICE_URL,
                  privateJwk: env.SERVICE_TOKEN_PRIVATE_JWK,
                }),
              inject: [SERVICE_CONFIG],
            },
        {
          provide: SALES_SHEET_OPTIONS,
          useFactory: sheetOptionsOf,
          inject: [SERVICE_CONFIG],
        },
        {
          provide: SALES_SHEET_QUEUE,
          useFactory: (options: SalesSheetOptions, outbox: OutboxPort) =>
            options.enabled ? outboxSheetQueue(outbox) : noSheetQueue,
          inject: [SALES_SHEET_OPTIONS, OUTBOX_PORT],
        },
        {
          provide: SALES_SHEET_SYNC,
          useFactory: (
            env: ProgramEnv,
            options: SalesSheetOptions,
            orders: SalesOrderRepository,
            prices: PriceItemRepository,
            staff: StaffDirectory,
          ) =>
            options.enabled
              ? new SalesSheetSync(
                  orders,
                  prices,
                  staff,
                  new GoogleSheetWriter({
                    spreadsheetId: env.SALES_SHEET_ID,
                    clientEmail: env.SALES_SHEET_SERVICE_ACCOUNT_EMAIL,
                    privateKey: env.SALES_SHEET_PRIVATE_KEY,
                  }),
                )
              : null,
          inject: [
            SERVICE_CONFIG,
            SALES_SHEET_OPTIONS,
            SALES_ORDER_REPOSITORY,
            PRICE_ITEM_REPOSITORY,
            STAFF_DIRECTORY,
          ],
        },
        SalesSheetWorkers,
        {
          provide: SALES_ORDER_SERVICE,
          useFactory: (
            orders: SalesOrderRepository,
            prices: PriceItemRepository,
            staff: StaffDirectory,
            unitOfWork: UnitOfWork,
            audit: AuditTrail,
            sheet: SalesSheetQueue,
          ) => new SalesOrderService(orders, prices, staff, unitOfWork, audit, sheet),
          inject: [
            SALES_ORDER_REPOSITORY,
            PRICE_ITEM_REPOSITORY,
            STAFF_DIRECTORY,
            UNIT_OF_WORK,
            AUDIT_TRAIL,
            SALES_SHEET_QUEUE,
          ],
        },
        {
          provide: WEB_ORDER_MIRROR,
          useFactory: (orders: SalesOrderRepository, sheet: SalesSheetQueue) =>
            new SalesWebOrderMirror(orders, sheet),
          inject: [SALES_ORDER_REPOSITORY, SALES_SHEET_QUEUE],
        },
        {
          provide: LEGACY_IMPORT_SERVICE,
          useFactory: (
            orders: SalesOrderRepository,
            prices: PriceItemRepository,
            staff: StaffDirectory,
            unitOfWork: UnitOfWork,
            audit: AuditTrail,
            sheet: SalesSheetQueue,
          ) => new LegacyImportService(orders, prices, staff, unitOfWork, audit, sheet),
          inject: [
            SALES_ORDER_REPOSITORY,
            PRICE_ITEM_REPOSITORY,
            STAFF_DIRECTORY,
            UNIT_OF_WORK,
            AUDIT_TRAIL,
            SALES_SHEET_QUEUE,
          ],
        },
        {
          provide: PRICE_LIST_SERVICE,
          useFactory: (
            prices: PriceItemRepository,
            unitOfWork: UnitOfWork,
            audit: AuditTrail,
            sheet: SalesSheetQueue,
          ) => new PriceListService(prices, unitOfWork, audit, sheet),
          inject: [PRICE_ITEM_REPOSITORY, UNIT_OF_WORK, AUDIT_TRAIL, SALES_SHEET_QUEUE],
        },
      ],
      exports: [
        SALES_ORDER_REPOSITORY,
        PRICE_ITEM_REPOSITORY,
        SALES_ORDER_SERVICE,
        LEGACY_IMPORT_SERVICE,
        WEB_ORDER_MIRROR,
      ],
    };
  }
}
