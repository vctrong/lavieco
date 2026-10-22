import type { TicketingText } from "./constants/text";

export type TicketingFailure = keyof TicketingText["errors"];

export type ActionResult<T = undefined> =
  | { status: "ok"; data: T }
  | { status: "invalid"; fieldErrors: Record<string, string> }
  | { status: "error"; reason: TicketingFailure; ref?: string };

/** Filters of the orders list, read from the URL (works without JavaScript). */
export type OrderListFilters = {
  eventId?: string;
  status?: string;
  flag?: string;
  q?: string;
  cursor?: string;
};
