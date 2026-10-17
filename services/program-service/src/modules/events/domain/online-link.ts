import { DomainError } from "@lavieco/shared";

import type { EventContent } from "./event";

/**
 * Tickets of an online event carry its link (email, ticket page). Once tickets are
 * sold the link can move to another URL, but never disappear: buyers would be left
 * without a way in (decision 4 of the Phase 3 review).
 */
export function assertOnlineLinkKept(
  current: Pick<EventContent, "format" | "onlineUrl">,
  next: Pick<EventContent, "format" | "onlineUrl">,
  soldSeats: number,
): void {
  if (soldSeats === 0 || current.format !== "online" || !current.onlineUrl) return;
  if (next.format !== "online" || !next.onlineUrl) {
    throw new DomainError("event.online_url_locked");
  }
}
