import "server-only";

import { notFound, redirect } from "next/navigation";

import { isServiceProblem } from "@lavieco/api-clients";
import {
  EVENT_FORMATS,
  EVENT_KINDS,
  EVENT_STATUSES,
  type EventListQuery,
} from "@lavieco/shared/events";

import { serverEnv } from "@/lib/env";
import { requestId } from "@/lib/request-meta";
import { programClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";

import type { EventListFilters } from "../types";

/**
 * Runs a program-service read for a page with the staff token. An expired token goes
 * through the refresh route and comes back to `path`; a missing event is a 404.
 */
async function withStaffToken<T>(path: string, read: (token: string) => Promise<T>): Promise<T> {
  const { accessToken, refreshToken } = await readStaffSession();
  const refreshUrl = `/api/auth/refresh?next=${encodeURIComponent(path)}`;
  if (!accessToken) redirect(refreshToken ? refreshUrl : "/login");
  try {
    return await read(accessToken);
  } catch (error) {
    if (isServiceProblem(error) && error.status === 401) {
      redirect(refreshToken ? refreshUrl : "/login");
    }
    if (isServiceProblem(error) && error.status === 404) notFound();
    throw error;
  }
}

const pick = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
  allowed.includes(value as T) ? (value as T) : undefined;

/** Only well-formed filters reach the service; anything else is ignored. */
export function toListQuery(filters: EventListFilters): Partial<EventListQuery> {
  return {
    status: pick(filters.status, EVENT_STATUSES),
    kind: pick(filters.kind, EVENT_KINDS),
    format: pick(filters.format, EVENT_FORMATS),
    typeId: filters.typeId && /^[0-9a-f]{24}$/.test(filters.typeId) ? filters.typeId : undefined,
    q: filters.q?.trim().slice(0, 100) || undefined,
    cursor: filters.cursor?.slice(0, 512) || undefined,
    limit: 20,
  };
}

export async function loadEventList(filters: EventListFilters) {
  return withStaffToken("/events", async (token) => {
    const id = await requestId();
    const [page, types] = await Promise.all([
      programClient().listEvents(token, toListQuery(filters), id),
      programClient().listEventTypes(token, true, id),
    ]);
    return { page, types: types.items };
  });
}

export async function loadEvent(eventId: string) {
  if (!/^[0-9a-f]{24}$/.test(eventId)) notFound();
  return withStaffToken(`/events/${eventId}`, async (token) => {
    const id = await requestId();
    const [event, types] = await Promise.all([
      programClient().getEvent(token, eventId, id),
      programClient().listEventTypes(token, true, id),
    ]);
    return { event, types: types.items };
  });
}

export async function loadEventTypes() {
  return withStaffToken("/events/types", async (token) => {
    const types = await programClient().listEventTypes(token, true, await requestId());
    return types.items;
  });
}

/**
 * Preview (D2): a fresh 10-minute token, rendered by `web` in an iframe. The admin
 * page itself is the link shared with teammates (it requires `program:read`).
 */
export async function loadPreview(eventId: string) {
  if (!/^[0-9a-f]{24}$/.test(eventId)) notFound();
  return withStaffToken(`/events/${eventId}/preview`, async (token) => {
    const id = await requestId();
    const [event, preview] = await Promise.all([
      programClient().getEvent(token, eventId, id),
      programClient().createEventPreviewToken(token, eventId, id),
    ]);
    const frameUrl = new URL(
      `/xem-truoc/chuong-trinh/${encodeURIComponent(preview.token)}`,
      serverEnv().WEB_APP_URL,
    ).toString();
    return { event, frameUrl };
  });
}
