import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";

import { OutboxWorker } from "@lavieco/service-kit";

import {
  CANCEL_PAYMENT_LINK_JOB,
  SEND_EVENT_CANCELLED_JOB,
  SEND_TICKETS_JOB,
} from "../application/order-jobs";
import type { OrderSettlementService } from "../application/order-settlement-service";
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from "../application/ports/order-repositories.port";
import {
  PAYMENT_GATEWAY,
  TICKET_MAILER,
  type PaymentGateway,
  type TicketMailer,
} from "../application/ports/order-services.port";
import { ORDER_SETTLEMENT_SERVICE } from "../orders.tokens";

/** Outbox handlers of the orders module. Payloads hold ids only (CLAUDE §10). */
@Injectable()
export class OrderJobHandlers implements OnModuleInit {
  constructor(
    private readonly worker: OutboxWorker,
    @Inject(TICKET_MAILER) private readonly mailer: TicketMailer,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(ORDER_SETTLEMENT_SERVICE) private readonly settlement: OrderSettlementService,
  ) {}

  onModuleInit() {
    this.worker.register(SEND_TICKETS_JOB, async (payload) => {
      await this.mailer.sendTickets(String(payload.orderId), {
        resend: payload.resend === true,
      });
    });
    this.worker.register(SEND_EVENT_CANCELLED_JOB, async (payload) => {
      await this.mailer.sendEventCancelled(String(payload.orderId));
    });
    // The order already ended (expired or cancelled): payOS just stops taking money.
    // If the buyer paid in the meantime, payOS refuses to cancel: settle it instead
    // (seats taken again if any are left, otherwise refund required).
    this.worker.register(CANCEL_PAYMENT_LINK_JOB, async (payload) => {
      const order = await this.orders.findById(String(payload.orderId));
      if (!order?.payment || order.status === "paid") return;
      try {
        await this.gateway.cancel(order.orderCode, "Don da het han hoac da huy");
      } catch (error) {
        const status = await this.gateway.getStatus(order.orderCode);
        if (status.status === "PAID") {
          await this.settlement.reconcile(order.id, { publicCall: false });
        } else if (status.status !== "CANCELLED" && status.status !== "EXPIRED") {
          throw error;
        }
      }
    });
  }
}
