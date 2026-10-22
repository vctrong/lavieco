import type {
  EventAgendaItem,
  EventBenefit,
  EventCancellationRule,
  EventDetails,
  EventFaqItem,
  EventForm,
  EventFormat,
  EventImage,
  EventKind,
  EventPricing,
  EventSpeaker,
  EventStatus,
  EventVenue,
} from "@lavieco/shared/events";

export type Actor = { userId: string };

export type StatusChange = { from: EventStatus; to: EventStatus; at: Date; by: string };

/** Editable content of an event, as stored (dates parsed, speaker portraits as snapshots). */
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
  cancellationRules: EventCancellationRule[];
  minAge: number | null;
  benefits: EventBenefit[];
  forChildren: boolean;
  speakers: EventSpeaker[];
  agenda: EventAgendaItem[];
  faq: EventFaqItem[];
};

/**
 * Attendance typed for an archive-only event (BR-09). `approvedAt` is cleared whenever
 * the count changes, so only an approved figure is ever published.
 */
export type EventAttendance = {
  count: number | null;
  approvedAt: Date | null;
  approvedBy: string | null;
};

export const NO_ATTENDANCE: EventAttendance = { count: null, approvedAt: null, approvedBy: null };

/** Set once, when a standard event is cancelled; `reason` is public. */
export type EventCancellation = { reason: string; at: Date; by: string };

/**
 * `events` (docs/03 §9.2). Not the publishable pattern: an event has one current
 * version, published by its editor without a second reviewer (BR-17, ADR-0014).
 */
export type EventRecord = EventContent & {
  id: string;
  kind: EventKind;
  slug: string;
  status: EventStatus;
  /** Snapshots of content-service media (ADR-0020); one image belongs to one event. */
  cover: EventImage | null;
  banner: EventImage | null;
  gallery: EventImage[];
  attendance: EventAttendance;
  cancellation: EventCancellation | null;
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

/**
 * Stored content of a create/update request. Speaker portraits come in as media ids:
 * `avatars` holds their snapshots, index for index (built by `buildImages`).
 */
export function toEventContent(
  details: EventDetails,
  avatars: readonly (EventImage | null)[],
): EventContent {
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
    cancellationRules: details.cancellationRules,
    minAge: details.minAge,
    benefits: details.benefits,
    forChildren: details.forChildren,
    speakers: details.speakers.map((speaker, index) => ({
      name: speaker.name,
      role: speaker.role,
      bio: speaker.bio,
      avatar: avatars[index] ?? null,
    })),
    agenda: details.agenda,
    faq: details.faq,
  };
}

/**
 * The attendance to store after an edit. Standard events never store one (their
 * attendance is the checked-in tickets); a changed count loses its approval (BR-09).
 */
export function nextAttendance(
  kind: EventKind,
  current: EventAttendance,
  count: number | null,
): EventAttendance {
  if (kind !== "past" || count === null) return NO_ATTENDANCE;
  if (count === current.count) return current;
  return { count, approvedAt: null, approvedBy: null };
}

/** Whether the public site shows this status at all (S3: never drafts). */
export function isPublicStatus(status: EventStatus): boolean {
  return status !== "draft";
}
