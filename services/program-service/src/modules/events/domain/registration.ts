import type { FormQuestion, RegistrationBlocker } from "@lavieco/shared/events";

import { isOnSale, seatsLeftOf, visible, type TicketTypeRecord } from "../../ticketing";
import type { EventRecord } from "./event";

/**
 * Only whether the online link is set matters here, never the link itself: public
 * queries do not even read it (S3), they carry `hasOnlineLink` instead.
 */
export type BookableEvent = Pick<EventRecord, "kind" | "status" | "format" | "startAt"> & {
  hasOnlineLink: boolean;
};

/** A full record as the booking rules see it. */
export const bookableOf = (event: EventRecord): BookableEvent => ({
  kind: event.kind,
  status: event.status,
  format: event.format,
  startAt: event.startAt,
  hasOnlineLink: event.onlineUrl !== null && event.onlineUrl !== "",
});

/**
 * Why the event cannot take registrations right now, or null when it can. Checked on
 * the public page ("Sắp mở đăng ký") AND again by the checkout, inside its
 * transaction. An online event without its link takes no booking at all: there would
 * be no ticket to issue (docs/05, decision 4 of the Phase 3 plan).
 */
export function registrationBlocker(
  event: BookableEvent,
  ticketTypes: readonly TicketTypeRecord[],
  now: Date,
): RegistrationBlocker | null {
  if (event.kind !== "standard" || event.status !== "published") return "not_open";
  if (event.startAt.getTime() <= now.getTime()) return "event_started";
  if (event.format === "online" && !event.hasOnlineLink) return "online_link_pending";
  const shown = visible(ticketTypes);
  if (shown.length === 0) return "not_open";
  const onSale = shown.filter((ticketType) => isOnSale(ticketType, now));
  if (onSale.length === 0) {
    const later = shown.some(
      (ticketType) => ticketType.saleStartAt !== null && ticketType.saleStartAt > now,
    );
    return later ? "sale_not_started" : "sale_ended";
  }
  if (onSale.every((ticketType) => seatsLeftOf(ticketType) === 0)) return "sold_out";
  return null;
}

/** Visible questions, in order, as the checkout renders and validates them. */
export function checkoutQuestions(questions: readonly FormQuestion[]): FormQuestion[] {
  return questions.filter((question) => !question.hidden);
}

/** The "đã đọc lưu ý an toàn" box is only asked when the event has safety notes. */
export const needsSafetyAcknowledgement = (event: Pick<EventRecord, "safetyNotes">) =>
  event.safetyNotes.trim().length > 0;
