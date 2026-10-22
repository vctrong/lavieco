import type {
  EventListItem,
  EventView,
  PublicEventCard,
  PublicEventDetail,
  TicketType,
} from "@lavieco/shared/events";

import { availabilityOf, priceRangeOf, seatsOf, type TicketTypeRecord } from "../../ticketing";
import type { EventSnapshot } from "../application/event-snapshot";
import type {
  PublicEventBundle,
  PublicEventDetailBundle,
} from "../application/event-public-service";
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
    cancellationRules: event.cancellationRules,
    minAge: event.minAge,
    benefits: event.benefits,
    forChildren: event.forChildren,
    speakers: event.speakers,
    agenda: event.agenda,
    faq: event.faq,
    cover: event.cover,
    banner: event.banner,
    gallery: event.gallery,
    attendance: {
      count: event.attendance.count,
      approvedAt: iso(event.attendance.approvedAt),
      approvedBy: event.attendance.approvedBy,
    },
    cancellation: event.cancellation
      ? { reason: event.cancellation.reason, at: event.cancellation.at.toISOString() }
      : null,
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
export function toPublicCardDto({
  event,
  type,
  ticketTypes,
  state,
}: PublicEventBundle): PublicEventCard {
  return {
    slug: event.slug,
    kind: event.kind,
    status: event.status,
    state,
    title: event.title,
    type: type ? { id: type.id, key: type.key, name: type.name } : null,
    format: event.format,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    venue: event.venue ? { name: event.venue.name, address: event.venue.address } : null,
    summary: event.summary,
    cover: event.cover,
    banner: event.banner,
    pricing: event.pricing,
    price: priceRangeOf(ticketTypes),
    availability: availabilityOf(ticketTypes),
  };
}

export function toPublicDetailDto(bundle: PublicEventDetailBundle): PublicEventDetail {
  const { event, ticketTypes, registration } = bundle;
  return {
    ...toPublicCardDto(bundle),
    venue: event.venue
      ? { name: event.venue.name, address: event.venue.address, mapUrl: event.venue.mapUrl }
      : null,
    description: event.description,
    safetyNotes: event.safetyNotes,
    cancellationPolicy: event.cancellationPolicy,
    cancellationRules: event.cancellationRules.map((rule) => ({
      condition: rule.condition,
      result: rule.result,
    })),
    minAge: event.minAge,
    benefits: event.benefits.map((benefit) => ({
      icon: benefit.icon,
      title: benefit.title,
      description: benefit.description,
    })),
    speakers: event.speakers.map((speaker) => ({
      name: speaker.name,
      role: speaker.role,
      bio: speaker.bio,
      avatar: speaker.avatar,
    })),
    agenda: event.agenda,
    faq: event.faq,
    gallery: event.gallery,
    // Reason and date only: who cancelled stays internal.
    cancellation: event.cancellation
      ? { reason: event.cancellation.reason, at: event.cancellation.at.toISOString() }
      : null,
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
    registration: {
      open: registration.blocker === null,
      blocker: registration.blocker,
      questions: registration.questions.map((question) => ({
        id: question.id,
        type: question.type,
        label: question.label,
        description: question.description,
        required: question.required,
        options: question.options.map((option) => ({ id: option.id, label: option.label })),
      })),
      safetyAcknowledgementRequired: registration.safetyAcknowledgementRequired,
      guardianConfirmationRequired: registration.guardianConfirmationRequired,
    },
  };
}
