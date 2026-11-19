import {
  priceItemListSchema,
  priceItemSchema,
  salesAssigneeListSchema,
  salesCustomerLookupSchema,
  salesOrderBulkResultSchema,
  salesOrderListSchema,
  salesOrderSchema,
  salesSummarySchema,
  type PriceItemCreateRequest,
  type PriceItemUpdateRequest,
  type SalesOrderBulkStatusRequest,
  type SalesOrderInput,
  type SalesOrderListQuery,
  type SalesOrderQuickUpdateRequest,
  type SalesOrderTeamFieldsRequest,
  type SalesOrderUpdateRequest,
} from "@lavieco/shared/sales";

import type { createHttpClient } from "./http-client";

const V1 = "/internal/v1/sales";

type Http = ReturnType<typeof createHttpClient>;

/** List filters as the URL carries them: arrays are comma separated. */
export type SalesOrderListParams = Partial<
  Omit<SalesOrderListQuery, "status" | "paymentStatus" | "orderType" | "channel" | "deleted">
> & {
  status?: readonly string[];
  paymentStatus?: readonly string[];
  orderType?: readonly string[];
  channel?: readonly string[];
  deleted?: boolean;
};

function queryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(","));
    } else search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

const segment = (value: string) => encodeURIComponent(value);

/** The team's order book (ADR-0030), spread into the program client; staff token only. */
export function salesMethods(http: Http) {
  const user = (accessToken: string) => ({ kind: "user", accessToken }) as const;

  return {
    listSalesOrders: (accessToken: string, query: SalesOrderListParams, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/orders${queryString(query)}`,
        auth: user(accessToken),
        schema: salesOrderListSchema,
        requestId,
      }),
    getSalesOrder: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/orders/${segment(id)}`,
        auth: user(accessToken),
        schema: salesOrderSchema,
        requestId,
      }),
    createSalesOrder: (accessToken: string, body: SalesOrderInput, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/orders`,
        auth: user(accessToken),
        body,
        schema: salesOrderSchema,
        requestId,
      }),
    updateSalesOrder: (
      accessToken: string,
      id: string,
      body: SalesOrderUpdateRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "PUT",
        path: `${V1}/orders/${segment(id)}`,
        auth: user(accessToken),
        body,
        schema: salesOrderSchema,
        requestId,
      }),
    updateSalesOrderTeam: (
      accessToken: string,
      id: string,
      body: SalesOrderTeamFieldsRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "PATCH",
        path: `${V1}/orders/${segment(id)}/team`,
        auth: user(accessToken),
        body,
        schema: salesOrderSchema,
        requestId,
      }),
    quickUpdateSalesOrder: (
      accessToken: string,
      id: string,
      body: SalesOrderQuickUpdateRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "PATCH",
        path: `${V1}/orders/${segment(id)}/status`,
        auth: user(accessToken),
        body,
        schema: salesOrderSchema,
        requestId,
      }),
    bulkSalesOrderStatus: (
      accessToken: string,
      body: SalesOrderBulkStatusRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/orders/bulk-status`,
        auth: user(accessToken),
        body,
        schema: salesOrderBulkResultSchema,
        requestId,
      }),
    deleteSalesOrder: (accessToken: string, id: string, revision: number, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/orders/${segment(id)}/delete`,
        auth: user(accessToken),
        body: { revision },
        schema: salesOrderSchema,
        requestId,
      }),
    restoreSalesOrder: (accessToken: string, id: string, revision: number, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/orders/${segment(id)}/restore`,
        auth: user(accessToken),
        body: { revision },
        schema: salesOrderSchema,
        requestId,
      }),
    lookupSalesCustomer: (accessToken: string, phone: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/customers${queryString({ phone })}`,
        auth: user(accessToken),
        schema: salesCustomerLookupSchema,
        requestId,
      }),
    listSalesAssignees: (accessToken: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/assignees`,
        auth: user(accessToken),
        schema: salesAssigneeListSchema,
        requestId,
      }),
    getSalesSummary: (accessToken: string, months: number, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/summary${queryString({ months })}`,
        auth: user(accessToken),
        schema: salesSummarySchema,
        requestId,
      }),

    // --- price list ---
    listPriceItems: (accessToken: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/price-items`,
        auth: user(accessToken),
        schema: priceItemListSchema,
        requestId,
      }),
    createPriceItem: (accessToken: string, body: PriceItemCreateRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/price-items`,
        auth: user(accessToken),
        body,
        schema: priceItemSchema,
        requestId,
      }),
    updatePriceItem: (
      accessToken: string,
      id: string,
      body: PriceItemUpdateRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "PATCH",
        path: `${V1}/price-items/${segment(id)}`,
        auth: user(accessToken),
        body,
        schema: priceItemSchema,
        requestId,
      }),
  };
}
