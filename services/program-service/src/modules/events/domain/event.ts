import type {
  EventCover,
  EventDetails,
  EventForm,
  EventFormat,
  EventKind,
  EventPricing,
  EventStatus,
  EventVenue,
} from "@lavieco/shared/events";

export type Actor = { userId: string };

export type StatusChange = { from: EventStatus; to: EventStatus; at: Date; by: string };

/** Editable content of an event, as stored (dates parsed). */
export type EventContent = {
  title: string;
  typeId: string;
  format: EventFormat;
  startAt: Date;
  endAt: Date;
  venue: EventVenue | null;
  onlineUrl: string | null;
  summary: string;
  description: string;
  safetyNotes: string;
  cancellationPolicy: string;
  speakers: EventDetails["speakers"];
  agenda: EventDetails["agenda"];
  faq: EventDetails["faq"];
};

/**
 * `events` (docs/03 §9.2). Not the publishable pattern: an event has one current
 * version, published by its editor without a second reviewer (BR-17, ADR-0014).
 */
export type EventRecord = EventContent & {
  id: string;
  kind: EventKind;
  slug: string;
  status: EventStatus;
  cover: EventCover | null;
  form: EventForm;
  /** Derived from ticket types, stored for the public "free" filter. */
  pricing: EventPricing;
  publishedAt: Date | null;
  /** Set on the first publication; from then on the slug (public URL) is frozen. */
  firstPublishedAt: Date | null;
  revision: number;
  createdBy: Actor;
  updatedBy: Actor;
  createdAt: Date;
  updatedAt: Date;
};

export function toEventContent(details: EventDetails): EventContent {
  return {
    title: details.title,
    typeId: details.typeId,
    format: details.format,
    startAt: new Date(details.startAt),
    endAt: new Date(details.endAt),
    venue: details.venue,
    onlineUrl: details.onlineUrl,
    summary: details.summary,
    description: details.description,
    safetyNotes: details.safetyNotes,
    cancellationPolicy: details.cancellationPolicy,
    speakers: details.speakers,
    agenda: details.agenda,
    faq: details.faq,
  };
}

/** Whether the public site shows this status at all (S3: never drafts). */
export function isPublicStatus(status: EventStatus): boolean {
  return status !== "draft";
}
