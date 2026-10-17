import type {
  EventListItem,
  EventView,
  PublicEventCard,
  PublicEventDetail,
  TicketType,
} from "@lavieco/shared/events";

import { availabilityOf, seatsOf, type TicketTypeRecord } from "../../ticketing";
import type { EventSnapshot } from "../application/event-snapshot";
import type { PublicEventBundle } from "../application/event-public-service";
import type { EventRecord } from "../domain/event";

const iso = (date: Date | null) => (date ? date.toISOString() : null);

export function toTicketTypeDto(record: TicketTypeRecord): TicketType {
  return {
    id: record.id,
    eventId: record.eventId,
    name: record.name,
    description: record.description,
    price: record.price,
    quantity: record.quantity,
    saleStartAt: iso(record.saleStartAt),
    saleEndAt: iso(record.saleEndAt),
    maxPerOrder: record.maxPerOrder,
    sortOrder: record.sortOrder,
    hidden: record.hidden,
    sold: record.sold,
    held: record.held,
    revision: record.revision,
  };
}

export function toEventDto(snapshot: EventSnapshot): EventView {
  const { event } = snapshot;
  return {
    id: event.id,
    kind: event.kind,
    slug: event.slug,
    slugLocked: event.firstPublishedAt !== null,
    status: event.status,
    title: event.title,
    typeId: event.typeId,
    format: event.format,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    venue: event.venue,
    onlineUrl: event.onlineUrl,
    summary: event.summary,
    description: event.description,
    safetyNotes: event.safetyNotes,
    cancellationPolicy: event.cancellationPolicy,
    speakers: event.speakers,
    agenda: event.agenda,
    faq: event.faq,
    cover: event.cover,
    gallery: event.gallery,
    form: event.form,
    ticketTypes: snapshot.ticketTypes.map(toTicketTypeDto),
    pricing: event.pricing,
    hasRegistrations: snapshot.hasRegistrations,
    readiness: snapshot.readiness,
    publishedAt: iso(event.publishedAt),
    revision: event.revision,
    createdBy: event.createdBy,
    updatedBy: event.updatedBy,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

export function toEventListItemDto(
  event: EventRecord,
  ticketTypes: TicketTypeRecord[],
): EventListItem {
  return {
    id: event.id,
    kind: event.kind,
    slug: event.slug,
    status: event.status,
    title: event.title,
    typeId: event.typeId,
    format: event.format,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    venueName: event.venue?.name ?? null,
    cover: event.cover,
    pricing: event.pricing,
    seats: seatsOf(ticketTypes),
    updatedAt: event.updatedAt.toISOString(),
  };
}

/**
 * Public card. Built field by field on purpose: nothing private (online link,
 * authors, form, counters) can slip through by spreading a record (S3).
 */
export function toPublicCardDto({ event, type, ticketTypes }: PublicEventBundle): PublicEventCard {
  return {
    slug: event.slug,
    kind: event.kind,
    status: event.status,
    title: event.title,
    type: type ? { id: type.id, key: type.key, name: type.name } : null,
    format: event.format,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    venue: event.venue ? { name: event.venue.name, address: event.venue.address } : null,
    summary: event.summary,
    cover: event.cover,
    pricing: event.pricing,
    availability: availabilityOf(ticketTypes),
  };
}

export function toPublicDetailDto(bundle: PublicEventBundle): PublicEventDetail {
  const { event, ticketTypes } = bundle;
  return {
    ...toPublicCardDto(bundle),
    venue: event.venue
      ? { name: event.venue.name, address: event.venue.address, mapUrl: event.venue.mapUrl }
      : null,
    description: event.description,
    safetyNotes: event.safetyNotes,
    cancellationPolicy: event.cancellationPolicy,
    speakers: event.speakers,
    agenda: event.agenda,
    faq: event.faq,
    gallery: event.gallery,
    ticketTypes: ticketTypes.map((ticketType) => ({
      id: ticketType.id,
      name: ticketType.name,
      description: ticketType.description,
      price: ticketType.price,
      saleStartAt: iso(ticketType.saleStartAt),
      saleEndAt: iso(ticketType.saleEndAt),
      maxPerOrder: ticketType.maxPerOrder,
      availability: availabilityOf([ticketType]),
    })),
  };
}
