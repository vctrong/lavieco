import "server-only";

import { notFound, redirect } from "next/navigation";

import { isServiceProblem } from "@lavieco/api-clients";
import { ORDER_FLAG_FILTERS, ORDER_STATUSES, type OrderListQuery } from "@lavieco/shared/events";

import { requestId } from "@/lib/request-meta";
import { programClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";

import type { OrderListFilters } from "../types";

/**
 * A program-service read for a page with the staff token. An expired token goes through
 * the refresh route and comes back to `path`; a missing order or event is a 404.
 */
async function withStaffToken<T>(path: string, read: (token: string, id: string) => Promise<T>) {
  const { accessToken, refreshToken } = await readStaffSession();
  const refreshUrl = `/api/auth/refresh?next=${encodeURIComponent(path)}`;
  if (!accessToken) redirect(refreshToken ? refreshUrl : "/login");
  try {
    return await read(accessToken, await requestId());
  } catch (error) {
    if (isServiceProblem(error) && error.status === 401) {
      redirect(refreshToken ? refreshUrl : "/login");
    }
    if (isServiceProblem(error) && (error.status === 404 || error.status === 400)) notFound();
    throw error;
  }
}

const pick = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
  allowed.includes(value as T) ? (value as T) : undefined;
const isObjectId = (value: string | undefined) => Boolean(value && /^[0-9a-f]{24}$/.test(value));

export function toOrderQuery(filters: OrderListFilters): Partial<OrderListQuery> {
  return {
    eventId: isObjectId(filters.eventId) ? filters.eventId : undefined,
    status: pick(filters.status, ORDER_STATUSES),
    flag: pick(filters.flag, ORDER_FLAG_FILTERS),
    q: filters.q?.trim().slice(0, 120) || undefined,
    cursor: filters.cursor?.slice(0, 512) || undefined,
    limit: 25,
  };
}

/** Orders page: the page itself, the events to filter by, and the refund alert count. */
export function loadOrders(filters: OrderListFilters) {
  return withStaffToken("/orders", async (token, id) => {
    const client = programClient();
    const [page, events, refunds] = await Promise.all([
      client.listOrders(token, toOrderQuery(filters), id),
      client.listEvents(token, { limit: 100 }, id),
      client.listOrders(token, { flag: "refund_required", status: "paid", limit: 100 }, id),
    ]);
    return { page, events: events.items, refundCount: refunds.items.length };
  });
}

export function loadOrder(orderId: string) {
  if (!isObjectId(orderId)) notFound();
  return withStaffToken(`/orders/${orderId}`, (token, id) =>
    programClient().getOrder(token, orderId, id),
  );
}

export function loadRegistrations(
  eventId: string,
  query: { q?: string; includeRefunded: boolean; cursor?: string },
) {
  if (!isObjectId(eventId)) notFound();
  return withStaffToken(`/events/${eventId}/registrations`, async (token, id) => {
    const client = programClient();
    const [event, list] = await Promise.all([
      client.getEvent(token, eventId, id),
      client.listRegistrations(
        token,
        eventId,
        {
          q: query.q?.trim().slice(0, 120) || undefined,
          includeRefunded: query.includeRefunded,
          cursor: query.cursor?.slice(0, 512) || undefined,
          limit: 100,
        },
        id,
      ),
    ]);
    return { event, list };
  });
}

/** Events the door team may scan for: published or closed, not ended. */
export function loadCheckinEvents() {
  return withStaffToken("/checkin", async (token, id) => {
    const client = programClient();
    const [published, closed] = await Promise.all([
      client.listEvents(token, { status: "published", kind: "standard", limit: 50 }, id),
      client.listEvents(token, { status: "closed", kind: "standard", limit: 50 }, id),
    ]);
    return [...published.items, ...closed.items].sort((a, b) => a.startAt.localeCompare(b.startAt));
  });
}

export function loadCheckinEvent(eventId: string) {
  if (!isObjectId(eventId)) notFound();
  return withStaffToken(`/checkin/${eventId}`, async (token, id) => {
    const client = programClient();
    const [event, stats] = await Promise.all([
      client.getEvent(token, eventId, id),
      client.getCheckinStats(token, eventId, id),
    ]);
    return { event, stats };
  });
}
