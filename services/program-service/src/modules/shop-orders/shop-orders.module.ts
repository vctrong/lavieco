import { type DynamicModule, Module } from "@nestjs/common";

import { EMAIL_SENDER, OUTBOX_PORT, SERVICE_CONFIG, UNIT_OF_WORK } from "@lavieco/service-kit";
import type { EmailSender, OutboxPort, UnitOfWork } from "@lavieco/service-kit/ports";

import type { ProgramEnv } from "../../config/env";
import { AUDIT_TRAIL, type AuditTrail } from "../audit";
import {
  EMAIL_PROOF_VERIFIER,
  ORDER_LINKS,
  PAYMENT_GATEWAY,
  type EmailProofVerifier,
  type OrderLinks,
  type PaymentGateway,
} from "../orders";
import { ExcelWorkbookWriter } from "../registrations";
import { CART_SERVICE, type CartService } from "../shop-carts";
import {
  CATALOG_REPOSITORY,
  PRODUCT_REPOSITORY,
  type CatalogRepository,
  type ProductRepository,
} from "../shop-catalog";
import { VOUCHER_LEDGER, VouchersModule, type VoucherLedger } from "../vouchers";
import { MirroringShopOrderRepository } from "./infrastructure/mirroring-shop-order.repository";
import { ShopOrdersAdminController } from "./api/shop-orders-admin.controller";
import { ShopOrdersPublicController } from "./api/shop-orders-public.controller";
import {
  SHOP_ORDER_MAILER,
  SHOP_ORDER_REPOSITORY,
  type ShopOrderMailer,
  type ShopOrderRepository,
} from "./application/ports";
import { ShopCheckoutService } from "./application/shop-checkout-service";
import { ShopOrderAdminService } from "./application/shop-order-admin-service";
import { ShopSettlementService } from "./application/shop-settlement-service";
import { SmtpShopOrderMailer } from "./infrastructure/shop-order-email";
import { shopOrderPersistence } from "./infrastructure/shop-order.repository";
import {
  ShopOrderExpiryScheduler,
  ShopOrderJobHandlers,
  type ShopExpiryOptions,
} from "./infrastructure/shop-order-workers";
import {
  SHOP_CHECKOUT_SERVICE,
  SHOP_EXPIRY_OPTIONS,
  SHOP_ORDER_ADMIN_SERVICE,
  SHOP_SETTLEMENT_SERVICE,
} from "./shop-orders.tokens";

/** Shop orders (UC-37, UC-40): checkout, payOS settlement, COD, fulfilment, export. */
@Module({})
export class ShopOrdersModule {
  static forRoot(deps: {
    orders: DynamicModule;
    shopCatalog: DynamicModule;
    shopCarts: DynamicModule;
    /** The order book: every saved shop order is mirrored there (ADR-0030). */
    sales: DynamicModule;
    expiry: ShopExpiryOptions;
  }): DynamicModule {
    return {
      module: ShopOrdersModule,
      imports: [
        shopOrderPersistence,
        deps.orders,
        deps.shopCatalog,
        deps.shopCarts,
        deps.sales,
        VouchersModule,
      ],
      controllers: [ShopOrdersPublicController, ShopOrdersAdminController],
      providers: [
        { provide: SHOP_ORDER_REPOSITORY, useClass: MirroringShopOrderRepository },
        { provide: SHOP_EXPIRY_OPTIONS, useValue: deps.expiry },
        {
          provide: SHOP_ORDER_MAILER,
          useFactory: (
            orders: ShopOrderRepository,
            catalog: CatalogRepository,
            links: OrderLinks,
            sender: EmailSender,
            env: ProgramEnv,
          ): ShopOrderMailer =>
            new SmtpShopOrderMailer(orders, catalog, links, sender, env.WEB_APP_URL),
          inject: [
            SHOP_ORDER_REPOSITORY,
            CATALOG_REPOSITORY,
            ORDER_LINKS,
            EMAIL_SENDER,
            SERVICE_CONFIG,
          ],
        },
        {
          provide: SHOP_CHECKOUT_SERVICE,
          useFactory: (
            orders: ShopOrderRepository,
            products: ProductRepository,
            catalog: CatalogRepository,
            carts: CartService,
            vouchers: VoucherLedger,
            proofs: EmailProofVerifier,
            gateway: PaymentGateway,
            links: OrderLinks,
            unitOfWork: UnitOfWork,
            outbox: OutboxPort,
            env: ProgramEnv,
          ) =>
            new ShopCheckoutService(
              orders,
              products,
              catalog,
              carts,
              vouchers,
              proofs,
              gateway,
              links,
              unitOfWork,
              outbox,
              {
                webAppUrl: env.WEB_APP_URL,
              },
            ),
          inject: [
            SHOP_ORDER_REPOSITORY,
            PRODUCT_REPOSITORY,
            CATALOG_REPOSITORY,
            CART_SERVICE,
            VOUCHER_LEDGER,
            EMAIL_PROOF_VERIFIER,
            PAYMENT_GATEWAY,
            ORDER_LINKS,
            UNIT_OF_WORK,
            OUTBOX_PORT,
            SERVICE_CONFIG,
          ],
        },
        {
          provide: SHOP_SETTLEMENT_SERVICE,
          useFactory: (
            orders: ShopOrderRepository,
            products: ProductRepository,
            vouchers: VoucherLedger,
            gateway: PaymentGateway,
            unitOfWork: UnitOfWork,
            outbox: OutboxPort,
          ) => new ShopSettlementService(orders, products, vouchers, gateway, unitOfWork, outbox),
          inject: [
            SHOP_ORDER_REPOSITORY,
            PRODUCT_REPOSITORY,
            VOUCHER_LEDGER,
            PAYMENT_GATEWAY,
            UNIT_OF_WORK,
            OUTBOX_PORT,
          ],
        },
        {
          provide: SHOP_ORDER_ADMIN_SERVICE,
          useFactory: (
            orders: ShopOrderRepository,
            products: ProductRepository,
            catalog: CatalogRepository,
            vouchers: VoucherLedger,
            audit: AuditTrail,
            unitOfWork: UnitOfWork,
            outbox: OutboxPort,
          ) =>
            new ShopOrderAdminService(
              orders,
              products,
              catalog,
              vouchers,
              new ExcelWorkbookWriter(),
              audit,
              unitOfWork,
              outbox,
            ),
          inject: [
            SHOP_ORDER_REPOSITORY,
            PRODUCT_REPOSITORY,
            CATALOG_REPOSITORY,
            VOUCHER_LEDGER,
            AUDIT_TRAIL,
            UNIT_OF_WORK,
            OUTBOX_PORT,
          ],
        },
        ShopOrderJobHandlers,
        ShopOrderExpiryScheduler,
      ],
      exports: [SHOP_SETTLEMENT_SERVICE, SHOP_ORDER_REPOSITORY],
    };
  }
}
