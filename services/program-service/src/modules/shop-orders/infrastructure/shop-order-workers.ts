import { randomUUID } from "node:crypto";

import { Inject, Injectable, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";

import type { Logger } from "@lavieco/observability";
import { LOGGER, OutboxWorker } from "@lavieco/service-kit";

import { PAYMENT_GATEWAY, type PaymentGateway } from "../../orders";
import { STAFF_ALERT_SINK, type StaffAlertSink } from "../../staff-alerts";
import {
  SHOP_ORDER_MAILER,
  SHOP_ORDER_REPOSITORY,
  type ShopOrderMailer,
  type ShopOrderRepository,
} from "../application/ports";
import type { ShopCheckoutService } from "../application/shop-checkout-service";
import { SHOP_ORDER_JOBS } from "../application/shop-order-jobs";
import { SHOP_CHECKOUT_SERVICE, SHOP_EXPIRY_OPTIONS } from "../shop-orders.tokens";

const MONEY = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

/** Outbox handlers of shop orders: emails, staff Web Push, payOS link cancellation. */
@Injectable()
export class ShopOrderJobHandlers implements OnModuleInit {
  constructor(
    private readonly worker: OutboxWorker,
    @Inject(SHOP_ORDER_REPOSITORY) private readonly orders: ShopOrderRepository,
    @Inject(SHOP_ORDER_MAILER) private readonly mailer: ShopOrderMailer,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(STAFF_ALERT_SINK) private readonly alerts: StaffAlertSink,
  ) {}

  onModuleInit() {
    this.worker.register(SHOP_ORDER_JOBS.email, async (payload) => {
      const kind = String(payload.kind);
      if (kind === "placed" || kind === "paid" || kind === "shipped" || kind === "cancelled") {
        await this.mailer.send(String(payload.orderId), kind);
      }
    });
    this.worker.register(SHOP_ORDER_JOBS.cancelLink, async (payload) => {
      const order = await this.orders.findById(String(payload.orderId));
      if (order?.payment && !order.paidAt && this.gateway.enabled) {
        await this.gateway
          .cancel(order.orderCode, "Đơn hết hạn hoặc đã huỷ")
          .catch(() => undefined);
      }
    });
    // No personal data in a push (ADR-0027): the public code and the amount only.
    this.worker.register(SHOP_ORDER_JOBS.alert, async (payload) => {
      const order = await this.orders.findById(String(payload.orderId));
      if (!order) return;
      const kind = String(payload.kind);
      const title =
        kind === "attention"
          ? `Đơn ${order.publicCode} cần xem lại`
          : kind === "paid"
            ? `Đơn hàng ${order.publicCode} đã thanh toán`
            : order.paymentMethod === "cod"
              ? `Đơn COD mới ${order.publicCode}: gọi xác nhận`
              : `Đơn hàng mới ${order.publicCode}`;
      await this.alerts.send({
        notificationId: randomUUID(),
        topic: kind === "attention" ? "order_attention" : "order_paid",
        title,
        body: `${order.items.reduce((s, i) => s + i.quantity, 0)} sản phẩm · ${MONEY.format(order.amount)}`,
        url: `/shop/orders/${order.id}`,
        tag: `shop-order-${order.id}`,
      });
    });
  }
}

export type ShopExpiryOptions = { run: boolean; intervalMs: number };

/** Releases unpaid orders past their hold (BR-22). Conditional updates: safe on several instances. */
@Injectable()
export class ShopOrderExpiryScheduler implements OnModuleInit, OnApplicationShutdown {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(SHOP_ORDER_REPOSITORY) private readonly orders: ShopOrderRepository,
    @Inject(SHOP_CHECKOUT_SERVICE) private readonly checkout: ShopCheckoutService,
    @Inject(SHOP_EXPIRY_OPTIONS) private readonly options: ShopExpiryOptions,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  onModuleInit() {
    if (!this.options.run) return;
    this.timer = setInterval(() => void this.runOnce(), this.options.intervalMs);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(now = new Date()) {
    if (this.running) return 0;
    this.running = true;
    try {
      const due = await this.orders.dueForExpiry(now, 100);
      for (const order of due) {
        await this.checkout.cancelUnpaid(
          order.id,
          now,
          order.status === "awaiting_payment" ? "expired" : "cancelled",
        );
      }
      if (due.length > 0) this.logger.info("expired shop orders", { count: due.length });
      return due.length;
    } catch (error) {
      this.logger.warn("shop order expiry failed", {
        errorCode: error instanceof Error ? error.name : "unknown",
      });
      return 0;
    } finally {
      this.running = false;
    }
  }
}
