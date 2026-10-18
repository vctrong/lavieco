import type { OrderStatus, TicketView } from "@lavieco/shared/events";

/** What a ticket card shows: valid, checked in, or void (refunded order, or cancelled). */
export type TicketState = "valid" | "used" | "refunded" | "cancelled";

/**
 * A ticket only turns void when its order is refunded today; "cancelled" covers any
 * other void ticket so the page never shows a void ticket as usable.
 */
export function ticketState(
  ticket: Pick<TicketView, "status">,
  orderStatus: OrderStatus,
): TicketState {
  if (ticket.status === "valid" && orderStatus === "paid") return "valid";
  if (ticket.status === "used") return "used";
  return orderStatus === "refunded" ? "refunded" : "cancelled";
}
