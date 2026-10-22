import type {
  BenefitIcon,
  EventFormat,
  EventImage,
  EventKind,
  EventView,
} from "@lavieco/shared/events";

import { isoToVietnamLocal, vietnamLocalToIso } from "./format";

/** An uploaded image in the form: what is shown, plus the alt text being edited. */
export type EventImageValue = EventImage;

export type SpeakerValue = {
  name: string;
  role: string;
  bio: string;
  avatar: EventImageValue | null;
};

export type BenefitValue = { icon: BenefitIcon; title: string; description: string };

/** What the details form edits; strings only, converted to the contract on submit. */
export type DetailsValues = {
  kind: EventKind;
  title: string;
  slug: string;
  typeId: string;
  format: EventFormat;
  startLocal: string;
  endLocal: string;
  venueName: string;
  venueAddress: string;
  mapUrl: string;
  onlineUrl: string;
  summary: string;
  description: string;
  safetyNotes: string;
  cancellationPolicy: string;
  cancellationRules: { condition: string; result: string }[];
  /** Digits only, "" = not stated. */
  minAge: string;
  benefits: BenefitValue[];
  forChildren: boolean;
  speakers: SpeakerValue[];
  agenda: { time: string; title: string; description: string }[];
  faq: { question: string; answer: string }[];
  cover: EventImageValue | null;
  banner: EventImageValue | null;
  gallery: EventImageValue[];
  /** Archive-only events; digits only, "" = not typed. */
  attendanceCount: string;
};

export function emptyDetails(typeId: string): DetailsValues {
  return {
    kind: "standard",
    title: "",
    slug: "",
    typeId,
    format: "offline",
    startLocal: "",
    endLocal: "",
    venueName: "",
    venueAddress: "",
    mapUrl: "",
    onlineUrl: "",
    summary: "",
    description: "",
    safetyNotes: "",
    cancellationPolicy: "",
    cancellationRules: [],
    minAge: "",
    benefits: [],
    forChildren: false,
    speakers: [],
    agenda: [],
    faq: [],
    cover: null,
    banner: null,
    gallery: [],
    attendanceCount: "",
  };
}

export function detailsOf(event: EventView): DetailsValues {
  return {
    kind: event.kind,
    title: event.title,
    slug: event.slug,
    typeId: event.typeId,
    format: event.format,
    startLocal: isoToVietnamLocal(event.startAt),
    endLocal: isoToVietnamLocal(event.endAt),
    venueName: event.venue?.name ?? "",
    venueAddress: event.venue?.address ?? "",
    mapUrl: event.venue?.mapUrl ?? "",
    onlineUrl: event.onlineUrl ?? "",
    summary: event.summary,
    description: event.description,
    safetyNotes: event.safetyNotes,
    cancellationPolicy: event.cancellationPolicy,
    cancellationRules: event.cancellationRules.map((rule) => ({ ...rule })),
    minAge: event.minAge === null ? "" : String(event.minAge),
    benefits: event.benefits.map((benefit) => ({ ...benefit })),
    forChildren: event.forChildren,
    speakers: event.speakers.map((speaker) => ({
      ...speaker,
      avatar: speaker.avatar ? { ...speaker.avatar } : null,
    })),
    agenda: event.agenda.map((item) => ({ ...item })),
    faq: event.faq.map((item) => ({ ...item })),
    cover: event.cover ? { ...event.cover } : null,
    banner: event.banner ? { ...event.banner } : null,
    gallery: event.gallery.map((image) => ({ ...image })),
    attendanceCount: event.attendance.count === null ? "" : String(event.attendance.count),
  };
}

/** Media ids the saved event already holds (the rest are uploaded but not saved yet). */
export function savedImageIds(event: EventView | null): Set<string> {
  if (!event) return new Set();
  const images = [
    event.cover,
    event.banner,
    ...event.gallery,
    ...event.speakers.map((speaker) => speaker.avatar),
  ];
  return new Set(images.flatMap((image) => (image ? [image.mediaId] : [])));
}

/** "" → null, digits → number; anything else stays as typed so the contract reports it. */
function optionalInt(value: string): number | null | string {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
}

const imageRef = (image: EventImageValue | null) =>
  image ? { mediaId: image.mediaId, alt: image.alt } : null;

/**
 * Request body for create/update (validated by the shared Zod contract afterwards).
 * The venue is only sent for offline events and the online link only for online ones;
 * a typed attendance only for archive-only events.
 */
export function toDetailsRequest(values: DetailsValues) {
  const offline = values.format === "offline";
  const hasVenue = offline && (values.venueName.trim() || values.venueAddress.trim());
  return {
    title: values.title,
    ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
    typeId: values.typeId,
    format: values.format,
    startAt: vietnamLocalToIso(values.startLocal) ?? values.startLocal,
    endAt: vietnamLocalToIso(values.endLocal) ?? values.endLocal,
    venue: hasVenue
      ? {
          name: values.venueName,
          address: values.venueAddress,
          mapUrl: values.mapUrl.trim() || null,
        }
      : null,
    onlineUrl: !offline && values.onlineUrl.trim() ? values.onlineUrl.trim() : null,
    summary: values.summary,
    description: values.description,
    safetyNotes: values.safetyNotes,
    cancellationPolicy: values.cancellationPolicy,
    cancellationRules: values.cancellationRules,
    minAge: optionalInt(values.minAge),
    benefits: values.benefits,
    forChildren: values.forChildren,
    // Only the media id and alt: program-service takes the file details from content-service.
    speakers: values.speakers.map((speaker) => ({ ...speaker, avatar: imageRef(speaker.avatar) })),
    agenda: values.agenda,
    faq: values.faq,
    cover: imageRef(values.cover),
    banner: imageRef(values.banner),
    gallery: values.gallery.map((image) => ({ mediaId: image.mediaId, alt: image.alt })),
    attendanceCount: values.kind === "past" ? optionalInt(values.attendanceCount) : null,
  };
}
