import type { EventsText } from "./constants/text";

export type EventFailure = keyof EventsText["errors"];

export type ActionResult<T = undefined> =
  | { status: "ok"; data: T }
  | { status: "invalid"; fieldErrors: Record<string, string> }
  | { status: "error"; reason: EventFailure };

/** Filters of the events list, read from the URL (works without JavaScript). */
export type EventListFilters = {
  status?: string;
  typeId?: string;
  format?: string;
  kind?: string;
  q?: string;
  cursor?: string;
};
