import {
  checkinResponseSchema,
  checkinStatsSchema,
  orderCreateResponseSchema,
  orderDetailSchema,
  orderListSchema,
  orderViewSchema,
  payosWebhookResponseSchema,
  registrationListSchema,
  ticketLookupResponseSchema,
  type CheckinRequest,
  type OrderCreateRequest,
  type OrderListQuery,
  type OrderRefundRequest,
  type RegistrationListQuery,
  eventListSchema,
  eventPreviewTokenSchema,
  eventSchema,
  eventTypeListSchema,
  eventTypeSchema,
  publicEventDetailSchema,
  publicEventListSchema,
  publicEventTypeListSchema,
  ticketTypeListSchema,
  ticketTypeSchema,
  type EventCreateRequest,
  type EventFormUpdateRequest,
  type EventListQuery,
  type EventStatusChangeRequest,
  type EventTypeCreateRequest,
  type EventTypeUpdateRequest,
  type EventUpdateRequest,
  type PublicEventListQuery,
  type TicketTypeCreateRequest,
  type TicketTypeUpdateRequest,
} from "@lavieco/shared/events";

import { STEP_UP_HEADER } from "@lavieco/shared/identity";

import { createHttpClient, type HttpClientOptions } from "./http-client";

const V1 = "/internal/v1";

export type ProgramClientOptions = Omit<HttpClientOptions, "audience">;

type QueryValue = string | number | boolean | undefined;

/** `?a=1&b=x` from the defined values only. */
function queryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

const segment = (value: string) => encodeURIComponent(value);

/**
 * Typed client of program-service (events, ticket types; docs/05, ADR-0014). Admin
 * calls carry the staff access token; public calls carry the `web` service token.
 */
export function createProgramClient(options: ProgramClientOptions) {
  const http = createHttpClient({ ...options, audience: "program-service" });
  const service = { kind: "service" } as const;
  const user = (accessToken: string) => ({ kind: "user", accessToken }) as const;

  return {
    // --- admin: event types ---
    listEventTypes: (accessToken: string, includeArchived = false, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/event-types${queryString({ includeArchived })}`,
        auth: user(accessToken),
        schema: eventTypeListSchema,
        requestId,
      }),
    createEventType: (accessToken: string, body: EventTypeCreateRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/event-types`,
        auth: user(accessToken),
        body,
        schema: eventTypeSchema,
        requestId,
      }),
    updateEventType: (
      accessToken: string,
      id: string,
      body: EventTypeUpdateRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "PATCH",
        path: `${V1}/event-types/${segment(id)}`,
        auth: user(accessToken),
        body,
        schema: eventTypeSchema,
        requestId,
      }),

    // --- admin: events ---
    listEvents: (accessToken: string, query: Partial<EventListQuery>, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/events${queryString(query)}`,
        auth: user(accessToken),
        schema: eventListSchema,
        requestId,
      }),
    getEvent: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/events/${segment(id)}`,
        auth: user(accessToken),
        schema: eventSchema,
        requestId,
      }),
    createEvent: (accessToken: string, body: EventCreateRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/events`,
        auth: user(accessToken),
        body,
        schema: eventSchema,
        requestId,
      }),
    updateEvent: (accessToken: string, id: string, body: EventUpdateRequest, requestId?: string) =>
      http.call({
        method: "PUT",
        path: `${V1}/events/${segment(id)}`,
        auth: user(accessToken),
        body,
        schema: eventSchema,
        requestId,
      }),
    updateEventForm: (
      accessToken: string,
      id: string,
      body: EventFormUpdateRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "PUT",
        path: `${V1}/events/${segment(id)}/form`,
        auth: user(accessToken),
        body,
        schema: eventSchema,
        requestId,
      }),
    changeEventStatus: (
      accessToken: string,
      id: string,
      body: EventStatusChangeRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/events/${segment(id)}/status`,
        auth: user(accessToken),
        body,
        schema: eventSchema,
        requestId,
      }),
    duplicateEvent: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/events/${segment(id)}/duplicate`,
        auth: user(accessToken),
        schema: eventSchema,
        requestId,
      }),
    discardEvent: (accessToken: string, id: string, revision: number, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/events/${segment(id)}/discard`,
        auth: user(accessToken),
        body: { revision },
        requestId,
      }),
    createEventPreviewToken: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/events/${segment(id)}/preview-tokens`,
        auth: user(accessToken),
        schema: eventPreviewTokenSchema,
        requestId,
      }),
    listTicketTypes: (accessToken: string, eventId: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/events/${segment(eventId)}/ticket-types`,
        auth: user(accessToken),
        schema: ticketTypeListSchema,
        requestId,
      }),
    createTicketType: (
      accessToken: string,
      eventId: string,
      body: TicketTypeCreateRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/events/${segment(eventId)}/ticket-types`,
        auth: user(accessToken),
        body,
        schema: ticketTypeSchema,
        requestId,
      }),
    updateTicketType: (
      accessToken: string,
      eventId: string,
      ticketTypeId: string,
      body: TicketTypeUpdateRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "PUT",
        path: `${V1}/events/${segment(eventId)}/ticket-types/${segment(ticketTypeId)}`,
        auth: user(accessToken),
        body,
        schema: ticketTypeSchema,
        requestId,
      }),

    // --- public (called by `web`) ---
    listPublicEventTypes: (requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/public-event-types`,
        auth: service,
        schema: publicEventTypeListSchema,
        requestId,
      }),
    listPublishedEvents: (query: Partial<PublicEventListQuery>, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/published-events${queryString(query)}`,
        auth: service,
        schema: publicEventListSchema,
        requestId,
      }),
    getPublishedEvent: (slug: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/published-events/${segment(slug)}`,
        auth: service,
        schema: publicEventDetailSchema,
        requestId,
      }),
    getEventPreview: (token: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/event-previews/${segment(token)}`,
        auth: service,
        schema: publicEventDetailSchema,
        requestId,
      }),

    // --- public: checkout, orders behind a signed link, ticket lookup (`web`) ---
    createOrder: (body: OrderCreateRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/orders`,
        auth: service,
        body,
        schema: orderCreateResponseSchema,
        // The payOS link is created inside the call.
        timeoutMs: 20_000,
        requestId,
      }),
    getOrderByLink: (token: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/order-links/${segment(token)}`,
        auth: service,
        schema: orderViewSchema,
        requestId,
      }),
    cancelOrderByLink: (token: string, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/order-links/${segment(token)}/cancel`,
        auth: service,
        schema: orderViewSchema,
        idempotent: true,
        requestId,
      }),
    reconcileOrderByLink: (token: string, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/order-links/${segment(token)}/reconcile`,
        auth: service,
        schema: orderViewSchema,
        timeoutMs: 20_000,
        requestId,
      }),
    lookupTickets: (verificationToken: string, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/ticket-lookups`,
        auth: service,
        body: { verificationToken },
        schema: ticketLookupResponseSchema,
        requestId,
      }),
    /** The payOS webhook body exactly as received: its signature is checked by the service. */
    forwardPayosWebhook: (rawJson: string, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/payment-webhooks/payos`,
        auth: service,
        rawJson,
        schema: payosWebhookResponseSchema,
        timeoutMs: 15_000,
        requestId,
      }),

    // --- admin: orders, registrations, check-in ---
    listOrders: (accessToken: string, query: Partial<OrderListQuery>, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/orders${queryString(query)}`,
        auth: user(accessToken),
        schema: orderListSchema,
        requestId,
      }),
    getOrder: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/orders/${segment(id)}`,
        auth: user(accessToken),
        schema: orderDetailSchema,
        requestId,
      }),
    reconcileOrder: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/orders/${segment(id)}/reconcile`,
        auth: user(accessToken),
        schema: orderDetailSchema,
        timeoutMs: 20_000,
        requestId,
      }),
    resendTickets: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/orders/${segment(id)}/resend-tickets`,
        auth: user(accessToken),
        requestId,
      }),
    refundOrder: (
      accessToken: string,
      id: string,
      body: OrderRefundRequest,
      stepUpToken: string,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/orders/${segment(id)}/refund`,
        auth: user(accessToken),
        body,
        headers: { [STEP_UP_HEADER]: stepUpToken },
        schema: orderDetailSchema,
        requestId,
      }),
    listRegistrations: (
      accessToken: string,
      eventId: string,
      query: Partial<RegistrationListQuery>,
      requestId?: string,
    ) =>
      http.call({
        method: "GET",
        path: `${V1}/events/${segment(eventId)}/registrations${queryString(query)}`,
        auth: user(accessToken),
        schema: registrationListSchema,
        requestId,
      }),
    exportRegistrations: (
      accessToken: string,
      eventId: string,
      options: { includeRefunded: boolean; stepUpToken: string },
      requestId?: string,
    ) =>
      http.download({
        path: `${V1}/events/${segment(eventId)}/registrations/export${queryString({
          includeRefunded: options.includeRefunded,
        })}`,
        auth: user(accessToken),
        headers: { [STEP_UP_HEADER]: options.stepUpToken },
        timeoutMs: 30_000,
        requestId,
      }),
    checkIn: (accessToken: string, body: CheckinRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/checkins`,
        auth: user(accessToken),
        body,
        schema: checkinResponseSchema,
        requestId,
      }),
    getCheckinStats: (accessToken: string, eventId: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/events/${segment(eventId)}/checkin-stats`,
        auth: user(accessToken),
        schema: checkinStatsSchema,
        requestId,
      }),
  };
}

export type ProgramClient = ReturnType<typeof createProgramClient>;
