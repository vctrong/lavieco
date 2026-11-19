import { type DynamicModule, Module } from "@nestjs/common";

import { SERVICE_CONFIG, UNIT_OF_WORK } from "@lavieco/service-kit";
import type { UnitOfWork } from "@lavieco/service-kit/ports";

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
import { PriceListService } from "./application/price-list-service";
import { noSheetQueue, type SalesSheetQueue } from "./application/sales-jobs";
import { SalesOrderService } from "./application/sales-order-service";
import { createIdentityStaffDirectory } from "./infrastructure/identity-staff-directory";
import { MongoPriceItemRepository } from "./infrastructure/price-item.repository";
import { MongoSalesOrderRepository } from "./infrastructure/sales-order.repository";
import { salesPersistence } from "./infrastructure/sales.models";
import { PRICE_LIST_SERVICE, SALES_ORDER_SERVICE, SALES_SHEET_QUEUE } from "./sales-orders.tokens";

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
        { provide: SALES_SHEET_QUEUE, useValue: noSheetQueue },
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
      exports: [SALES_ORDER_REPOSITORY, PRICE_ITEM_REPOSITORY, SALES_ORDER_SERVICE],
    };
  }
}
