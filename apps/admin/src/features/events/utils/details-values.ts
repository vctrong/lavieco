import type { EventFormat, EventKind, EventView } from "@lavieco/shared/events";

import { isoToVietnamLocal, vietnamLocalToIso } from "./format";

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
  speakers: { name: string; role: string }[];
  agenda: { time: string; title: string }[];
  faq: { question: string; answer: string }[];
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
    speakers: [],
    agenda: [],
    faq: [],
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
    speakers: event.speakers.map((speaker) => ({ ...speaker })),
    agenda: event.agenda.map((item) => ({ ...item })),
    faq: event.faq.map((item) => ({ ...item })),
  };
}

/**
 * Request body for create/update (validated by the shared Zod contract afterwards).
 * The venue is only sent for offline events and the online link only for online ones.
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
    speakers: values.speakers,
    agenda: values.agenda,
    faq: values.faq,
  };
}
