import {
  emailButton,
  emailDetails,
  emailPanel,
  emailParagraph,
  emailSubheading,
  escapeHtml,
  multiline,
  renderEmail,
} from "@lavieco/service-kit";

import type { EventRecord } from "../../events";
import type { OrderRecord } from "../domain/order";
import { formatSchedule } from "./ticket-email.template";

const MONEY = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export type EventCancelledEmailInput = {
  order: OrderRecord;
  event: EventRecord;
  /** `/chuong-trinh`: other programmes to look at. */
  programsUrl: string;
  webAppUrl: string;
};

/**
 * "Chương trình đã huỷ" (decision of 22/10/2026): the public reason, the order code and
 * what happens to the money. Refunds are manual bank transfers (BR-15): the email says
 * the team will contact the buyer, never that money was already sent. Booker only.
 */
export function eventCancelledEmail(input: EventCancelledEmailInput) {
  const { order, event, programsUrl, webAppUrl } = input;
  const schedule = formatSchedule(event.startAt, event.endAt);
  const reason = event.cancellation?.reason.trim() ?? "";
  const free = order.amount === 0;
  const greeting = `Xin chào ${order.buyer.fullName},`;
  const intro = `LAVIECO rất tiếc phải huỷ "${event.title}". Vé của bạn không còn dùng được để check-in.`;
  const money = free
    ? "Đơn của bạn là đơn miễn phí nên không có khoản nào cần hoàn."
    : `Đội LAVIECO sẽ liên hệ qua email hoặc số điện thoại bạn đã đăng ký để hoàn ${MONEY.format(order.amount)} bằng chuyển khoản. Bạn không cần làm gì thêm.`;

  const bodyHtml = [
    emailParagraph(`${escapeHtml(greeting)}<br>${escapeHtml(intro)}`),
    emailPanel(
      emailSubheading(event.title) +
        emailDetails([
          ["Thời gian dự kiến", escapeHtml(schedule)],
          ["Mã đơn", String(order.orderCode)],
        ]) +
        (reason ? emailSubheading("Lý do") + emailParagraph(multiline(reason)) : ""),
      "canary",
    ),
    emailParagraph(escapeHtml(money)),
    emailButton("Xem chương trình khác", programsUrl),
  ].join("\n");

  const textLines = [
    greeting,
    intro,
    "",
    event.title,
    `Thời gian dự kiến: ${schedule}`,
    `Mã đơn: ${order.orderCode}`,
    ...(reason ? ["", `Lý do: ${reason}`] : []),
    "",
    money,
    "",
    `Xem chương trình khác: ${programsUrl}`,
  ];

  return renderEmail({
    subject: `Chương trình đã huỷ: ${event.title}`,
    preheader: `Mã đơn ${order.orderCode} · ${free ? "Không cần hoàn tiền" : "LAVIECO sẽ liên hệ hoàn tiền"}`,
    eyebrow: "Đã huỷ",
    heading: "Chương trình đã bị huỷ",
    bodyHtml,
    textLines,
    reason: `Bạn nhận email này vì đã đặt vé "${event.title}" trên website LAVIECO bằng địa chỉ email này.`,
    siteUrl: webAppUrl,
  });
}
