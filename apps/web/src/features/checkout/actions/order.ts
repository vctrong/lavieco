"use server";

import type { OrderView } from "@lavieco/shared/events";

import { requestId } from "@/lib/request-meta";
import { programClient } from "@/lib/services";

import { orderTokenSchema } from "../schemas";
import { toCheckoutError } from "../server/outcomes";
import type { CheckoutResult } from "../types";

/**
 * The buyer gives up a pending order. Only the signed link can do it (never the order
 * code); seats go back at once and the payOS link is cancelled by the service.
 */
export async function cancelOrder(token: unknown): Promise<CheckoutResult<{ order: OrderView }>> {
  const parsed = orderTokenSchema.safeParse(token);
  if (!parsed.success) return { status: "error", reason: "invalid_state" };
  try {
    return {
      status: "ok",
      order: await programClient().cancelOrderByLink(parsed.data, await requestId()),
    };
  } catch (error) {
    return toCheckoutError(error, "order.cancel");
  }
}

/**
 * Back from payOS while the order still looks pending: program-service asks payOS
 * itself (throttled). The query string of the return URL is never trusted (BR-15).
 */
export async function reconcileOrder(
  token: unknown,
): Promise<CheckoutResult<{ order: OrderView }>> {
  const parsed = orderTokenSchema.safeParse(token);
  if (!parsed.success) return { status: "error", reason: "invalid_state" };
  try {
    return {
      status: "ok",
      order: await programClient().reconcileOrderByLink(parsed.data, await requestId()),
    };
  } catch (error) {
    return toCheckoutError(error, "order.reconcile");
  }
}
