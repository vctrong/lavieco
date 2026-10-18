import { EVENT_LIMITS } from "@lavieco/shared/events";

import type { TicketTypeChanges, TicketTypeRecord } from "../../ticketing";
import type { EventContent, EventRecord } from "./event";

const COPY_SUFFIX = " (bản sao)";

/**
 * "Nhân bản chương trình" (docs/05): a new draft with the same content, form and
 * ticket types. Never copies status, history, publication dates or seat counters.
 * Question ids are kept: they only need to be unique within one event.
 */
export function duplicateOf(
  source: EventRecord,
  ticketTypes: readonly TicketTypeRecord[],
): {
  content: EventContent;
  form: EventRecord["form"];
  ticketTypes: TicketTypeChanges[];
} {
  const title = `${source.title.slice(0, EVENT_LIMITS.titleMax - COPY_SUFFIX.length)}${COPY_SUFFIX}`;
  return {
    content: {
      title,
      typeId: source.typeId,
      format: source.format,
      startAt: source.startAt,
      endAt: source.endAt,
      venue: source.venue,
      onlineUrl: source.onlineUrl,
      summary: source.summary,
      description: source.description,
      safetyNotes: source.safetyNotes,
      cancellationPolicy: source.cancellationPolicy,
      forChildren: source.forChildren,
      speakers: source.speakers,
      agenda: source.agenda,
      faq: source.faq,
    },
    form: { questions: source.form.questions.map((question) => ({ ...question })) },
    ticketTypes: ticketTypes.map((ticketType) => ({
      name: ticketType.name,
      description: ticketType.description,
      price: ticketType.price,
      quantity: ticketType.quantity,
      saleStartAt: ticketType.saleStartAt,
      saleEndAt: ticketType.saleEndAt,
      maxPerOrder: ticketType.maxPerOrder,
      sortOrder: ticketType.sortOrder,
      hidden: ticketType.hidden,
    })),
  };
}
