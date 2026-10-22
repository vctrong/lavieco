import { DomainError } from "@lavieco/shared";
import type { EventAction, EventKind, EventReadiness, EventStatus } from "@lavieco/shared/events";

export type TransitionContext = {
  kind: EventKind;
  status: EventStatus;
  hasRegistrations: boolean;
  readiness: EventReadiness;
};

/**
 * Event state machine (docs/05, ADR-0014, BR-17):
 * - standard: draft → published → closed ⇄ published → ended (final);
 *   unpublish back to draft only while nobody has registered.
 * - past (archive only): draft → ended directly on publish; can be unpublished.
 * Publishing requires an empty blocker list; no second reviewer.
 */
export function nextStatus(action: EventAction, context: TransitionContext): EventStatus {
  const { kind, status } = context;
  const invalid = () => new DomainError("event.invalid_transition", `${action} from ${status}`);

  switch (action) {
    case "publish":
      if (status !== "draft") throw invalid();
      if (context.readiness.blockers.length > 0) throw new DomainError("event.not_publishable");
      return kind === "past" ? "ended" : "published";
    case "unpublish":
      if (kind === "past") {
        if (status !== "ended") throw invalid();
        return "draft";
      }
      if (status !== "published" && status !== "closed") throw invalid();
      // BR-17: once someone registered, the event cannot go back to draft.
      if (context.hasRegistrations) throw new DomainError("event.has_registrations");
      return "draft";
    case "close":
      if (kind === "past" || status !== "published") throw invalid();
      return "closed";
    case "reopen":
      if (kind === "past" || status !== "closed") throw invalid();
      return "published";
    case "end":
      if (kind === "past" || (status !== "published" && status !== "closed")) throw invalid();
      return "ended";
  }
}

/**
 * "Huỷ chương trình": a published or closed standard event that has not finished yet.
 * Final, like `ended`. Not one of the plain status actions: it needs a public reason,
 * step-up and settles the orders (docs/05, decision of 22/10/2026).
 */
export function assertCancellable(
  event: { kind: EventKind; status: EventStatus; endAt: Date },
  now: Date,
): void {
  const open = event.status === "published" || event.status === "closed";
  if (event.kind !== "standard" || !open || event.endAt.getTime() <= now.getTime()) {
    throw new DomainError("event.invalid_transition", `cancel from ${event.status}`);
  }
}
