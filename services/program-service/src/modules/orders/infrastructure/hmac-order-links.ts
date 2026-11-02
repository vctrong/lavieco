import { createHmac, timingSafeEqual } from "node:crypto";

import type { OrderLinks } from "../application/ports/order-services.port";

const ORDER_ID = /^[0-9a-f]{24}$/;

/**
 * `<orderId>.<HMAC-SHA256>` links for `/ve/[token]`, the payment page and the buyer's
 * cancellation (docs/05 §5.4). Long-lived on purpose: it is the guest's only key to
 * their tickets. The secret lives in program-service only; rotating it invalidates
 * every link already emailed.
 */
export class HmacOrderLinks implements OrderLinks {
  constructor(private readonly secret: Buffer) {}

  sign(orderId: string): string {
    return `${orderId}.${this.mac(orderId)}`;
  }

  verify(token: string): string | null {
    const [orderId, mac, extra] = token.split(".");
    if (!orderId || !mac || extra !== undefined || !ORDER_ID.test(orderId)) return null;
    const expected = Buffer.from(this.mac(orderId));
    const given = Buffer.from(mac);
    return given.length === expected.length && timingSafeEqual(given, expected) ? orderId : null;
  }

  signTicket(ticket: { id: string; qrToken: string }): string {
    return `${ticket.id}.${this.ticketMac(ticket)}`;
  }

  ticketIdOf(token: string): string | null {
    const [ticketId, mac, extra] = token.split(".");
    return ticketId && mac && extra === undefined && ORDER_ID.test(ticketId) ? ticketId : null;
  }

  verifyTicket(token: string, ticket: { id: string; qrToken: string }): boolean {
    const expected = Buffer.from(this.signTicket(ticket));
    const given = Buffer.from(token);
    return given.length === expected.length && timingSafeEqual(given, expected);
  }

  private ticketMac(ticket: { id: string; qrToken: string }): string {
    return createHmac("sha256", this.secret)
      .update(`ticket:${ticket.id}:${ticket.qrToken}`)
      .digest("base64url");
  }

  private mac(orderId: string): string {
    return createHmac("sha256", this.secret).update(`order:${orderId}`).digest("base64url");
  }
}
