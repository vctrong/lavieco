import "server-only";

import type { OrderView } from "@lavieco/shared/events";

import { getOrder } from "./orders";

/** Polled every 3 s by the payment page: the order behind the signed link, or null. */
export function getOrderStatus(token: string): Promise<OrderView | null> {
  return getOrder(token);
}
