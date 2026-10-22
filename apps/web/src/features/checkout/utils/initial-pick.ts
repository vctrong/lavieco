import type { PublicTicketType } from "@lavieco/shared/events";

/** `?ve=<ticketTypeId>&sl=<n>` as sent by the ticket box of the event page. */
export type CheckoutPick = { ve?: string; sl?: string };

/**
 * Starting quantities of the checkout form. A pick from the event page is used only
 * if it names a bookable ticket type and a quantity within its limits; otherwise the
 * single available ticket type gets one seat, or nothing is pre-selected. Only a
 * convenience: the form and program-service validate the order again.
 */
export function initialQuantities(
  ticketTypes: readonly PublicTicketType[],
  pick: CheckoutPick = {},
): Record<string, number> {
  const ticket = ticketTypes.find((type) => type.id === pick.ve);
  const quantity = Number(pick.sl);
  if (ticket && !ticket.availability.soldOut && Number.isInteger(quantity) && quantity >= 1) {
    const max = Math.min(ticket.maxPerOrder, ticket.availability.seatsLeft ?? ticket.maxPerOrder);
    return { [ticket.id]: Math.min(quantity, max) };
  }
  const open = ticketTypes.filter((type) => !type.availability.soldOut);
  return open.length === 1 && ticketTypes.length === 1 ? { [open[0]!.id]: 1 } : {};
}
