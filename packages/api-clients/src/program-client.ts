import {
  checkinResponseSchema,
  checkinStatsSchema,
  orderCreateResponseSchema,
  orderDetailSchema,
  orderListSchema,
  orderViewSchema,
  eventFeedbackLinkSchema,
  publicSurveySchema,
  publicVoucherListSchema,
  surveyListSchema,
  surveyResultsSchema,
  surveySchema,
  sharedTicketViewSchema,
  voucherCheckResponseSchema,
  voucherListSchema,
  voucherSchema,
  voucherStatsSchema,
  payosWebhookResponseSchema,
  registrationListSchema,
  ticketLookupResponseSchema,
  type CheckinRequest,
  type OrderCreateRequest,
  type OrderListQuery,
  type OrderRefundRequest,
  type PublicSurveyQuery,
  type SurveyCreateRequest,
  type SurveyListQuery,
  type SurveyStatusRequest,
  type SurveySubmitRequest,
  type SurveyUpdateRequest,
  type TicketReissueRequest,
  type VoucherCheckRequest,
  type VoucherCreateRequest,
  type VoucherListQuery,
  type VoucherStatusRequest,
  type VoucherUpdateRequest,
  type RegistrationListQuery,
  eventCancelImpactSchema,
  eventListSchema,
  eventPreviewTokenSchema,
  eventSchema,
  eventTypeListSchema,
  eventTypeSchema,
  publicEventAttendanceSchema,
  publicEventDetailSchema,
  publicEventListSchema,
  publicEventTypeListSchema,
  ticketTypeListSchema,
  ticketTypeSchema,
  type EventAttendanceApproveRequest,
  type EventCancelRequest,
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
    /** "N người đã tham gia" of an ended event; null when unknown or not approved (BR-09). */
    getPublishedEventAttendance: (slug: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/published-events/${segment(slug)}/attendance`,
        auth: service,
        schema: publicEventAttendanceSchema,
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
    checkVoucher: (body: VoucherCheckRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/voucher-checks`,
        auth: service,
        body,
        schema: voucherCheckResponseSchema,
        requestId,
      }),
    listPublicVouchers: (slug: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/published-events/${segment(slug)}/vouchers`,
        auth: service,
        schema: publicVoucherListSchema,
        requestId,
      }),
    getPublicSurvey: (slug: string, query: PublicSurveyQuery, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/public-surveys/${segment(slug)}${queryString(query)}`,
        auth: service,
        schema: publicSurveySchema,
        requestId,
      }),
    submitSurvey: (slug: string, body: SurveySubmitRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/public-surveys/${segment(slug)}/responses`,
        auth: service,
        body,
        requestId,
      }),
    getFeedbackSurvey: (eventSlug: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/published-events/${segment(eventSlug)}/feedback-survey`,
        auth: service,
        schema: eventFeedbackLinkSchema,
        requestId,
      }),
    getSharedTicket: (token: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/ticket-links/${segment(token)}`,
        auth: service,
        schema: sharedTicketViewSchema,
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
    listVouchers: (accessToken: string, query: Partial<VoucherListQuery>, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/vouchers${queryString(query)}`,
        auth: user(accessToken),
        schema: voucherListSchema,
        requestId,
      }),
    getVoucher: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/vouchers/${segment(id)}`,
        auth: user(accessToken),
        schema: voucherSchema,
        requestId,
      }),
    getVoucherStats: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/orders/voucher-stats/${segment(id)}`,
        auth: user(accessToken),
        schema: voucherStatsSchema,
        requestId,
      }),
    createVoucher: (accessToken: string, body: VoucherCreateRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/vouchers`,
        auth: user(accessToken),
        body,
        schema: voucherSchema,
        requestId,
      }),
    updateVoucher: (
      accessToken: string,
      id: string,
      body: VoucherUpdateRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "PATCH",
        path: `${V1}/vouchers/${segment(id)}`,
        auth: user(accessToken),
        body,
        schema: voucherSchema,
        requestId,
      }),
    setVoucherStatus: (
      accessToken: string,
      id: string,
      body: VoucherStatusRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/vouchers/${segment(id)}/status`,
        auth: user(accessToken),
        body,
        schema: voucherSchema,
        requestId,
      }),
    duplicateVoucher: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/vouchers/${segment(id)}/duplicate`,
        auth: user(accessToken),
        schema: voucherSchema,
        requestId,
      }),
    listSurveys: (accessToken: string, query: Partial<SurveyListQuery>, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/surveys${queryString(query)}`,
        auth: user(accessToken),
        schema: surveyListSchema,
        requestId,
      }),
    getSurvey: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/surveys/${segment(id)}`,
        auth: user(accessToken),
        schema: surveySchema,
        requestId,
      }),
    getSurveyResults: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/surveys/${segment(id)}/results`,
        auth: user(accessToken),
        schema: surveyResultsSchema,
        requestId,
      }),
    createSurvey: (accessToken: string, body: SurveyCreateRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/surveys`,
        auth: user(accessToken),
        body,
        schema: surveySchema,
        requestId,
      }),
    updateSurvey: (
      accessToken: string,
      id: string,
      body: SurveyUpdateRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "PATCH",
        path: `${V1}/surveys/${segment(id)}`,
        auth: user(accessToken),
        body,
        schema: surveySchema,
        requestId,
      }),
    setSurveyStatus: (
      accessToken: string,
      id: string,
      body: SurveyStatusRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/surveys/${segment(id)}/status`,
        auth: user(accessToken),
        body,
        schema: surveySchema,
        requestId,
      }),
    duplicateSurvey: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/surveys/${segment(id)}/duplicate`,
        auth: user(accessToken),
        schema: surveySchema,
        requestId,
      }),
    exportSurvey: (
      accessToken: string,
      id: string,
      options: { format: "xlsx" | "csv"; stepUpToken: string },
      requestId?: string,
    ) =>
      http.download({
        path: `${V1}/surveys/${segment(id)}/export${queryString({ format: options.format })}`,
        auth: user(accessToken),
        headers: { [STEP_UP_HEADER]: options.stepUpToken },
        timeoutMs: 30_000,
        requestId,
      }),
    reissueTicketQr: (
      accessToken: string,
      ticketId: string,
      body: TicketReissueRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/orders/tickets/${segment(ticketId)}/reissue-qr`,
        auth: user(accessToken),
        body,
        schema: orderDetailSchema,
        requestId,
      }),
    resendTickets: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/orders/${segment(id)}/resend-tickets`,
        auth: user(accessToken),
        requestId,
      }),
    getEventCancelImpact: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/events/${segment(id)}/cancel-impact`,
        auth: user(accessToken),
        schema: eventCancelImpactSchema,
        requestId,
      }),
    /** "Huỷ chương trình": step-up required (ADR-0021). */
    cancelEvent: (
      accessToken: string,
      id: string,
      body: EventCancelRequest,
      stepUpToken: string,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/events/${segment(id)}/cancel`,
        auth: user(accessToken),
        body,
        headers: { [STEP_UP_HEADER]: stepUpToken },
        requestId,
      }),
    /** BR-09: needs `impact:approve`. */
    approveEventAttendance: (
      accessToken: string,
      id: string,
      body: EventAttendanceApproveRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/events/${segment(id)}/attendance/approve`,
        auth: user(accessToken),
        body,
        schema: eventSchema,
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
