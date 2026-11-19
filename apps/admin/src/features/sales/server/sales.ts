import "server-only";

import { notFound, redirect } from "next/navigation";

import { isServiceProblem, type SalesOrderListParams } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";
import type { SalesSummaryPeriod } from "@lavieco/shared/sales";

import { failureKind, refOf } from "@/lib/action-errors";
import { requestId } from "@/lib/request-meta";
import { adminLogger, programClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";
import { withStaffToken } from "@/lib/staff-token";

import type { SalesActionResult, SalesFailure } from "../types";

/** Reads for Server Components: an expired token goes through the refresh route. */
async function read<T>(path: string, run: (token: string, id: string) => Promise<T>): Promise<T> {
  const { accessToken, refreshToken } = await readStaffSession();
  const refresh = `/api/auth/refresh?next=${encodeURIComponent(path)}`;
  if (!accessToken) redirect(refreshToken ? refresh : "/login");
  try {
    return await run(accessToken, await requestId());
  } catch (error) {
    if (isServiceProblem(error) && error.status === 401)
      redirect(refreshToken ? refresh : "/login");
    if (isServiceProblem(error) && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }
}

const isId = (value: string) => /^[0-9a-f]{24}$/.test(value);

export const loadSalesOrders = (path: string, query: SalesOrderListParams) =>
  read(path, (token, id) => programClient().listSalesOrders(token, { limit: 30, ...query }, id));

export function loadSalesOrder(orderId: string) {
  if (!isId(orderId)) notFound();
  return read(`/sales/${orderId}`, (token, id) =>
    programClient().getSalesOrder(token, orderId, id),
  );
}

/** Detail shown next to the list on wide screens: a bad id just shows no panel. */
export async function loadSalesOrderPanel(orderId: string | undefined) {
  if (!orderId || !isId(orderId)) return null;
  try {
    return await read("/sales", (token, id) => programClient().getSalesOrder(token, orderId, id));
  } catch (error) {
    if (isServiceProblem(error)) return null;
    throw error;
  }
}

export const loadSalesSummary = (path: string, period: SalesSummaryPeriod = "6") =>
  read(path, (token, id) => programClient().getSalesSummary(token, period, id));

export const loadPriceItems = (path: string) =>
  read(path, async (token, id) => (await programClient().listPriceItems(token, id)).items);

/** Staff to assign; an identity hiccup only empties the picker. */
export async function loadAssignees(path: string) {
  try {
    return await read(
      path,
      async (token, id) => (await programClient().listSalesAssignees(token, id)).items,
    );
  } catch (error) {
    if (isServiceProblem(error)) return [];
    throw error;
  }
}

const FAILURE_BY_CODE: Partial<Record<ErrorCode, SalesFailure>> = {
  "common.unauthenticated": "session_expired",
  "common.forbidden": "forbidden",
  "common.not_found": "not_found",
  "common.conflict": "conflict",
  "common.validation_failed": "invalid",
  "sales_order.due_day_required": "due_day_required",
  "sales_order.totals_invalid": "totals_invalid",
  "sales_order.web_order_locked": "web_order_locked",
  "sales_order.unknown_assignee": "unknown_assignee",
  "sales_order.unknown_price_item": "unknown_price_item",
  "address.invalid": "address_invalid",
};

/** Runs a write with the staff token; program-service checks `sales:write` itself. */
export async function callSales<T>(
  context: string,
  run: (token: string, id: string) => Promise<T>,
): Promise<SalesActionResult<T>> {
  const id = await requestId();
  try {
    const call = await withStaffToken(id, (token) => run(token, id));
    if (call.session === "expired") return { status: "error", reason: "session_expired" };
    return { status: "ok", data: call.value };
  } catch (error) {
    if (isServiceProblem(error)) {
      const reason = FAILURE_BY_CODE[error.code];
      if (reason) return { status: "error", reason };
    }
    adminLogger().warn("sales action failed", {
      context,
      requestId: id,
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
      ...(isServiceProblem(error) ? {} : failureKind(error)),
    });
    return { status: "error", reason: "unavailable", ref: refOf(id) };
  }
}
