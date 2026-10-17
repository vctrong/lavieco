import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";

import { OutboxWorker } from "@lavieco/service-kit";

import { CANCEL_PAYMENT_LINK_JOB, SEND_TICKETS_JOB } from "../application/order-jobs";
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

/** Outbox handlers of the orders module. Payloads hold ids only (CLAUDE §10). */
@Injectable()
export class OrderJobHandlers implements OnModuleInit {
  constructor(
    private readonly worker: OutboxWorker,
    @Inject(TICKET_MAILER) private readonly mailer: TicketMailer,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  onModuleInit() {
    this.worker.register(SEND_TICKETS_JOB, async (payload) => {
      await this.mailer.sendTickets(String(payload.orderId));
    });
    // The order already ended (expired or cancelled): payOS just stops taking money.
    this.worker.register(CANCEL_PAYMENT_LINK_JOB, async (payload) => {
      const order = await this.orders.findById(String(payload.orderId));
      if (!order?.payment || order.status === "paid") return;
      await this.gateway.cancel(order.orderCode, "Don da het han hoac da huy");
    });
  }
}
