import { toBuffer } from "qrcode";

import type { EmailSender } from "@lavieco/service-kit/ports";

import type { EventRepository } from "../../events";
import type {
  OrderRepository,
  TicketRepository,
} from "../application/ports/order-repositories.port";
import type { OrderLinks, TicketMailer } from "../application/ports/order-services.port";
import { qrCid, ticketEmail } from "./ticket-email.template";

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

  async sendTickets(orderId: string): Promise<void> {
    const order = await this.orders.findById(orderId);
    // Refunded (or never paid) by the time the job runs: nothing to send.
    if (!order || order.status !== "paid") return;
    const [event] = await this.events.findByIds([order.eventId]);
    const tickets = (await this.tickets.listByOrder(order.id)).filter(
      (ticket) => ticket.status !== "void",
    );
    if (!event || tickets.length === 0) return;

    const ticketPageUrl = `${this.webAppUrl}/ve/${this.links.sign(order.id)}`;
    const mail = ticketEmail({ order, event, tickets, ticketPageUrl });
    const attachments = await Promise.all(
      tickets.map(async (ticket) => ({
        filename: `${ticket.code}.png`,
        content: await toBuffer(ticket.qrToken, {
          type: "png",
          errorCorrectionLevel: "M",
          margin: 2,
          width: 400,
        }),
        contentType: "image/png",
        cid: qrCid(ticket),
      })),
    );
    await this.sender.send({ to: order.buyer.email, ...mail, attachments });
  }
}
