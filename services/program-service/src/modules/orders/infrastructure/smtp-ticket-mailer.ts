import { toBuffer } from "qrcode";

import type { EmailSender } from "@lavieco/service-kit/ports";

import type { EventRepository } from "../../events";
import type {
  OrderRepository,
  TicketRepository,
} from "../application/ports/order-repositories.port";
import type { OrderLinks, TicketMailer } from "../application/ports/order-services.port";
import { eventCancelledEmail } from "./event-cancelled-email.template";
import { qrAttachment, ticketEmail } from "./ticket-email.template";

/** 400 px for a 200 px slot (sharp on 2× screens), with a quiet zone of its own. */
export const QR_IMAGE_OPTIONS = {
  type: "png",
  errorCorrectionLevel: "M",
  margin: 2,
  width: 400,
} as const;

/**
 * Renders and sends the ticket email of a paid order (outbox `order.send_tickets`).
 * Loads everything by id when it runs: the outbox payload carries no personal data.
 */
export class SmtpTicketMailer implements TicketMailer {
  constructor(
    private readonly orders: OrderRepository,
    private readonly tickets: TicketRepository,
    private readonly events: EventRepository,
    private readonly links: OrderLinks,
    private readonly sender: EmailSender,
    private readonly webAppUrl: string,
  ) {}

  async sendTickets(orderId: string, options: { resend?: boolean } = {}): Promise<void> {
    const order = await this.orders.findById(orderId);
    // Refunded (or never paid) by the time the job runs: nothing to send.
    if (!order || order.status !== "paid") return;
    const [event] = await this.events.findByIds([order.eventId]);
    const tickets = (await this.tickets.listByOrder(order.id)).filter(
      (ticket) => ticket.status !== "void",
    );
    if (!event || tickets.length === 0) return;

    const ticketPageUrl = `${this.webAppUrl}/ve/${this.links.sign(order.id)}`;
    const mail = ticketEmail({
      order,
      event,
      tickets,
      ticketPageUrl,
      webAppUrl: this.webAppUrl,
      resend: options.resend === true,
    });
    const qrImages = await Promise.all(
      tickets.map(async (ticket) =>
        qrAttachment(ticket, await toBuffer(ticket.qrToken, QR_IMAGE_OPTIONS)),
      ),
    );
    await this.sender.send({
      to: order.buyer.email,
      ...mail,
      attachments: [...mail.attachments, ...qrImages],
    });
  }

  async sendEventCancelled(orderId: string): Promise<void> {
    const order = await this.orders.findById(orderId);
    // Refunded already by the time the job runs: the buyer heard from the team.
    if (!order || order.status !== "paid") return;
    const [event] = await this.events.findByIds([order.eventId]);
    if (!event || event.status !== "cancelled") return;
    const mail = eventCancelledEmail({
      order,
      event,
      programsUrl: new URL("/chuong-trinh", this.webAppUrl).toString(),
      webAppUrl: this.webAppUrl,
    });
    await this.sender.send({ to: order.buyer.email, ...mail });
  }
}
