import { createHash } from "node:crypto";

import type { PushNotificationRequest } from "@lavieco/shared/identity";

import type { OrderRecord } from "./order";

export type StaffAlertReason = "confirmed" | "refund_required" | "amount_mismatch";
export type SeatAlertKind = "few_left" | "sold_out";

const MONEY = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
const TITLE_MAX = 90;

/**
 * A UUID derived from a name: the same outbox job always yields the same id, so
 * identity-service drops a retried alert (ADR-0027). Version 8 ("custom") layout.
 */
export function stableAlertId(name: string): string {
  const hex = createHash("sha256").update(`lavieco-staff-alert:${name}`).digest("hex");
  const variant = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `8${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

function shorten(text: string): string {
  return text.length <= TITLE_MAX ? text : `${text.slice(0, TITLE_MAX - 1)}…`;
}

/** People (tickets) in an order: one ticket per person, a combo counts each seat. */
function peopleOf(order: Pick<OrderRecord, "items">): number {
  return order.items.reduce((sum, item) => sum + item.quantity * item.seatsPerUnit, 0);
}

/**
 * The alert for an order. Event title, counts, amount and order code only: never the
 * buyer's name, email or phone (CLAUDE §11), since it shows on a lock screen.
 */
export function orderAlert(
  order: Pick<OrderRecord, "id" | "orderCode" | "amount" | "items">,
  eventTitle: string,
  reason: StaffAlertReason,
): PushNotificationRequest {
  const title = shorten(eventTitle);
  const base = {
    notificationId: stableAlertId(`order:${order.id}:${reason}`),
    url: `/orders/${order.id}`,
    tag: `order-${order.orderCode}`,
  };
  switch (reason) {
    case "confirmed":
      return order.amount === 0
        ? {
            ...base,
            topic: "registration_free",
            title: "Có đăng ký mới",
            body: `${title} · ${peopleOf(order)} vé miễn phí`,
          }
        : {
            ...base,
            topic: "order_paid",
            title: "Đơn vé mới đã thanh toán",
            body: `${title} · ${peopleOf(order)} vé · ${MONEY.format(order.amount)}`,
          };
    case "refund_required":
      return {
        ...base,
        topic: "order_attention",
        title: "Đơn cần hoàn tiền thủ công",
        body: `Đơn ${order.orderCode} · ${title}: đã nhận tiền nhưng không còn chỗ.`,
      };
    case "amount_mismatch":
      return {
        ...base,
        topic: "order_attention",
        title: "Thanh toán lệch số tiền",
        body: `Đơn ${order.orderCode} · ${title}: số tiền nhận khác số tiền của đơn.`,
      };
  }
}

/** Once per event and kind (claimed on the event, see `claimSeatAlert`). */
export function seatAlert(
  event: { id: string; title: string },
  kind: SeatAlertKind,
  seatsLeft: number | null,
): PushNotificationRequest {
  const title = shorten(event.title);
  return {
    notificationId: stableAlertId(`event:${event.id}:${kind}`),
    topic: "event_seats",
    url: `/events/${event.id}`,
    tag: `seats-${event.id}`,
    ...(kind === "sold_out"
      ? { title: "Đã hết chỗ", body: `${title} đã kín chỗ.` }
      : {
          title: "Sắp hết chỗ",
          body:
            seatsLeft === null ? `${title} sắp kín chỗ.` : `${title}: chỉ còn ${seatsLeft} chỗ.`,
        }),
  };
}
