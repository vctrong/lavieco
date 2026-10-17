import type { EventReadiness, PublishBlocker, PublishWarning } from "@lavieco/shared/events";

import type { EventContent } from "./event";

export type ReadinessContext = {
  kind: "standard" | "past";
  content: EventContent;
  /** Visible ticket types of the event. */
  visibleTicketTypes: number;
  typeSelectable: boolean;
  now: Date;
};

/**
 * Publishing conditions shown as the admin checklist. Blockers prevent publishing;
 * warnings only inform. Safety notes are optional; a missing online link is a
 * warning (tickets for online events are not issued without it, TODO(phase-3)).
 */
export function readinessOf(context: ReadinessContext): EventReadiness {
  const { kind, content, now } = context;
  const blockers: PublishBlocker[] = [];
  const warnings: PublishWarning[] = [];

  if (kind === "standard") {
    if (content.startAt.getTime() <= now.getTime()) blockers.push("start_in_past");
    if (context.visibleTicketTypes === 0) blockers.push("ticket_type_missing");
  } else if (content.endAt.getTime() > now.getTime()) {
    // An archive-only event must already be over.
    blockers.push("past_event_not_finished");
  }
  if (content.format === "offline" && content.venue === null) blockers.push("venue_missing");
  if (!context.typeSelectable) blockers.push("event_type_archived");

  if (kind === "standard" && content.format === "online" && !content.onlineUrl) {
    warnings.push("online_url_missing");
  }
  if (!content.summary) warnings.push("summary_missing");

  return { blockers, warnings };
}
