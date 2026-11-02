import type { CampaignAudience } from "@lavieco/shared/events";

import type { OrderRecord, OrderRepository, TicketRecord, TicketRepository } from "../../orders";
import type { SurveyResponseRepository } from "../../surveys";
import type { AudienceSource } from "../application/campaign-service";
import type { Candidate } from "../domain/campaign";

const PAGE = 200;

/** Every paid order of an event, page by page, with the tickets that match the filter. */
async function eventCandidates(
  orders: OrderRepository,
  tickets: TicketRepository,
  audience: Extract<CampaignAudience, { type: "event" }>,
): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  let cursor: string | undefined;
  do {
    const page = await orders.listForRegistrations(audience.eventId, {
      includeRefunded: false,
      cursor,
      limit: PAGE,
    });
    const byOrder = await tickets.listByOrders(page.items.map((order) => order.id));
    for (const order of page.items) {
      const matching = (byOrder.get(order.id) ?? []).filter((ticket) => keeps(ticket, audience));
      if (matching.length === 0) continue;
      candidates.push({
        email: order.buyer.email,
        name: order.buyer.fullName,
        orderIds: [order.id],
        ticketIds: matching.map((ticket) => ticket.id),
      });
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return candidates;
}

function keeps(ticket: TicketRecord, audience: Extract<CampaignAudience, { type: "event" }>) {
  if (ticket.status === "void") return false;
  if (audience.checkin === "checked_in" && ticket.status !== "used") return false;
  if (audience.checkin === "not_checked_in" && ticket.status !== "valid") return false;
  return (
    audience.ticketTypeIds.length === 0 || audience.ticketTypeIds.includes(ticket.ticketTypeId)
  );
}

/** People who bought, in the period, at least `minOrders` times. */
async function pastBuyerCandidates(
  orders: OrderRepository,
  audience: Extract<CampaignAudience, { type: "past_buyers" }>,
): Promise<Candidate[]> {
  const paid = await orders.listPaid({
    from: audience.from ? new Date(audience.from) : null,
    to: audience.to ? new Date(audience.to) : null,
  });
  const counts = new Map<string, OrderRecord[]>();
  for (const order of paid) {
    const list = counts.get(order.buyer.emailNormalized) ?? [];
    list.push(order);
    counts.set(order.buyer.emailNormalized, list);
  }
  return [...counts.values()]
    .filter((list) => list.length >= audience.minOrders)
    .map((list) => ({
      email: list[0]!.buyer.email,
      name: list[0]!.buyer.fullName,
      orderIds: list.map((order) => order.id),
    }));
}

export function audienceSourceOf(
  orders: OrderRepository,
  tickets: TicketRepository,
  responses: SurveyResponseRepository,
): AudienceSource {
  return async (audience) => {
    switch (audience.type) {
      case "event":
        return eventCandidates(orders, tickets, audience);
      case "past_buyers":
        return pastBuyerCandidates(orders, audience);
      case "survey_respondents": {
        const rows = await responses.list(audience.surveyId);
        return rows.flatMap((row) =>
          row.email ? [{ email: row.email, name: row.name ?? "" }] : [],
        );
      }
      case "manual":
        return audience.entries.map((entry) => ({ email: entry.email, name: entry.name }));
    }
  };
}
