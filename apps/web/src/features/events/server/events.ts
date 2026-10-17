import "server-only";

import { unstable_cache } from "next/cache";

import { isServiceProblem } from "@lavieco/api-clients";
import {
  EVENT_CACHE_TAGS,
  EVENT_FORMATS,
  type PublicEventDetail,
  type PublicEventList,
  type PublicEventListQuery,
  type PublicEventType,
} from "@lavieco/shared/events";

import { programClient, webLogger } from "@/lib/services";

import { EVENTS_CACHE_SECONDS } from "../constants/config";

export type EventFilters = {
  typeId?: string;
  format?: string;
  free?: string;
  month?: string;
  cursor?: string;
};

const cacheOptions = (tags: string[]) => ({ tags, revalidate: EVENTS_CACHE_SECONDS });

/**
 * Upcoming or past events. Cached under `program:events`; program-service asks for a
 * revalidation through `/api/revalidate` whenever a public event changes.
 */
const cachedList = unstable_cache(
  (query: Partial<PublicEventListQuery>) => programClient().listPublishedEvents(query),
  ["program-events-list"],
  cacheOptions([EVENT_CACHE_TAGS.list]),
);

const cachedTypes = unstable_cache(
  async () => (await programClient().listPublicEventTypes()).items,
  ["program-event-types"],
  cacheOptions([EVENT_CACHE_TAGS.list]),
);

/** Only well-formed filters are sent; anything else behaves like no filter. */
export function toQuery(
  scope: "upcoming" | "past",
  filters: EventFilters,
  limit: number,
): Partial<PublicEventListQuery> {
  return {
    scope,
    limit,
    typeId: filters.typeId && /^[0-9a-f]{24}$/.test(filters.typeId) ? filters.typeId : undefined,
    format: (EVENT_FORMATS as readonly string[]).includes(filters.format ?? "")
      ? (filters.format as PublicEventListQuery["format"])
      : undefined,
    free: filters.free === "true" ? true : undefined,
    month:
      filters.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(filters.month) ? filters.month : undefined,
    cursor: filters.cursor?.slice(0, 512) || undefined,
  };
}

/** A failing service degrades to an empty list, never a broken page. */
export async function listEvents(
  scope: "upcoming" | "past",
  filters: EventFilters,
  limit: number,
): Promise<PublicEventList> {
  try {
    return await cachedList(toQuery(scope, filters, limit));
  } catch (error) {
    webLogger().warn("events list unavailable", {
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    return { items: [], nextCursor: null };
  }
}

export async function listEventTypes(): Promise<PublicEventType[]> {
  try {
    return await cachedTypes();
  } catch {
    return [];
  }
}

/** `null` for unknown or unpublished slugs (the page then renders a 404). */
export async function getEvent(slug: string): Promise<PublicEventDetail | null> {
  const cached = unstable_cache(
    () => programClient().getPublishedEvent(slug),
    ["program-event", slug],
    cacheOptions([EVENT_CACHE_TAGS.list, EVENT_CACHE_TAGS.item(slug)]),
  );
  try {
    return await cached();
  } catch (error) {
    if (isServiceProblem(error) && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

/** Preview of any status behind a 10-minute token (D2). Never cached. */
export async function getPreview(token: string): Promise<PublicEventDetail | null> {
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return null;
  try {
    return await programClient().getEventPreview(token);
  } catch (error) {
    if (isServiceProblem(error) && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}
