import type { TxContext } from "@lavieco/service-kit/ports";
import type { OutboxPort } from "@lavieco/service-kit/ports";

import type { OrderRecord } from "../domain/order";
import { newQrToken, newTicketCode } from "../domain/codes";
import type { TicketRecord } from "../domain/ticket";
import type { TicketRepository } from "./ports/order-repositories.port";

/** Outbox job: email the tickets of a paid order. Payload `{ orderId }` (no PII). */
export const SEND_TICKETS_JOB = "order.send_tickets";
/** Outbox job: cancel the payOS link of an order that ended unpaid. Payload `{ orderId }`. */
export const CANCEL_PAYMENT_LINK_JOB = "payment.cancel_link";

/**
 * One ticket per seat, each with its own random QR token (BR-16). Codes are random:
 * they are checked against existing ones before the insert, because a duplicate key
 * would abort the whole transaction.
 */
export async function issueTickets(
  tickets: TicketRepository,
  order: Pick<OrderRecord, "id" | "eventId" | "items">,
  tx: TxContext,
): Promise<TicketRecord[]> {
  const seats = order.items.flatMap((item) =>
    Array.from({ length: item.quantity }, () => ({
      ticketTypeId: item.ticketTypeId,
      ticketTypeName: item.name,
    })),
  );
  const codes = seats.map(() => newTicketCode());
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taken = await tickets.existingCodes(codes, tx);
    const duplicates = codes.filter(
      (code, index) => taken.has(code) || codes.indexOf(code) !== index,
    );
    if (duplicates.length === 0) break;
    codes.forEach((code, index) => {
      if (taken.has(code) || codes.indexOf(code) !== index) codes[index] = newTicketCode();
    });
  }
  return tickets.insertMany(
    seats.map((seat, index) => ({
      ...seat,
      code: codes[index]!,
      qrToken: newQrToken(),
      orderId: order.id,
      eventId: order.eventId,
    })),
    tx,
  );
}

/** A paid order: tickets issued and emailed through the outbox, in the caller's transaction. */
export async function issueAndSend(
  tickets: TicketRepository,
  outbox: OutboxPort,
  order: Pick<OrderRecord, "id" | "eventId" | "items">,
  tx: TxContext,
): Promise<void> {
  await issueTickets(tickets, order, tx);
  await outbox.enqueue(tx, { type: SEND_TICKETS_JOB, payload: { orderId: order.id } });
}
