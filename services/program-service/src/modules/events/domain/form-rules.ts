import { DomainError } from "@lavieco/shared";
import type { EventForm, EventKind } from "@lavieco/shared/events";

/**
 * BR-17: once people have registered, questions can only be added, hidden, reworded
 * or reordered, and choices only added. Removing a question or a choice, or changing
 * a question type, would orphan answers that are still exported.
 */
export function assertFormChangeAllowed(
  previous: EventForm,
  next: EventForm,
  context: { kind: EventKind; hasRegistrations: boolean },
): void {
  if (context.kind === "past" && next.questions.length > 0) {
    throw new DomainError("event.past_event_restricted");
  }
  if (!context.hasRegistrations) return;

  const nextById = new Map(next.questions.map((question) => [question.id, question]));
  for (const before of previous.questions) {
    const after = nextById.get(before.id);
    if (!after) throw new DomainError("event.form_locked", "question removed");
    if (after.type !== before.type) throw new DomainError("event.form_locked", "type changed");
    const optionIds = new Set(after.options.map((option) => option.id));
    if (before.options.some((option) => !optionIds.has(option.id))) {
      throw new DomainError("event.form_locked", "option removed");
    }
  }
}
