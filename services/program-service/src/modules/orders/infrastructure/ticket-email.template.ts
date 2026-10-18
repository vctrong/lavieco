import {
  EMAIL_COLORS as C,
  EMAIL_FONTS as F,
  emailButton,
  emailDetails,
  emailLink,
  emailPanel,
  emailParagraph,
  emailSecondaryButton,
  emailSubheading,
  escapeHtml,
  multiline,
  renderEmail,
  type EmailAttachment,
} from "@lavieco/service-kit";

import type { EventRecord } from "../../events";
import type { OrderRecord } from "../domain/order";
import type { TicketRecord } from "../domain/ticket";

const TIME_ZONE = "Asia/Ho_Chi_Minh";
const WEEKDAY_DATE = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const SHORT_DATE = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const CLOCK = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});
const MONEY = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

/** `Chủ Nhật, 08/11/2026 · 14:00–17:00`, or both ends with their time for a multi-day event. */
export function formatSchedule(start: Date, end: Date): string {
  if (SHORT_DATE.format(start) === SHORT_DATE.format(end)) {
    return `${WEEKDAY_DATE.format(start)} · ${CLOCK.format(start)}–${CLOCK.format(end)}`;
  }
  return `${CLOCK.format(start)} ${SHORT_DATE.format(start)} – ${CLOCK.format(end)} ${SHORT_DATE.format(end)}`;
}

/** Content id of a ticket's QR: the ticket code only, never personal data. */
export const qrCid = (ticket: Pick<TicketRecord, "code">) => `qr-${ticket.code}@lavieco`;

const KEEP_SAFE =
  "Không cần in vé: mở email này hoặc trang vé tại cửa. Mỗi mã QR chỉ check-in được một lần, đừng chia sẻ cho người khác.";

/** One ticket: type, position, QR on white (scannable even when the client darkens the email), code. */
function ticketBlock(ticket: TicketRecord, index: number, total: number) {
  const code = escapeHtml(ticket.code);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.white}" style="margin:0 0 16px;background:${C.white};border:1px solid ${C.hairline};border-radius:16px;border-collapse:separate"><tr><td style="padding:14px 20px;border-bottom:1px dashed ${C.hairline};font-family:${F.body};font-size:15px;line-height:22px;font-weight:bold;color:${C.deepBlue}">${escapeHtml(ticket.ticketTypeName)}</td><td align="right" style="padding:14px 20px;border-bottom:1px dashed ${C.hairline};font-family:${F.body};font-size:12px;color:${C.muted};white-space:nowrap">Vé ${index + 1}/${total}</td></tr><tr><td colspan="2" align="center" style="padding:20px"><img src="cid:${qrCid(ticket)}" width="200" height="200" alt="Mã QR vé ${code}" style="display:block;border:0;width:200px;height:200px"><p style="margin:12px 0 2px;font-family:${F.mono};font-size:20px;line-height:26px;font-weight:bold;letter-spacing:3px;color:${C.deepBlue}">${code}</p><p style="margin:0;font-family:${F.body};font-size:12px;line-height:18px;color:${C.muted}">Mỗi mã chỉ check-in được một lần</p></td></tr></table>`;
}

export type TicketEmailInput = {
  order: OrderRecord;
  event: EventRecord;
  tickets: TicketRecord[];
  ticketPageUrl: string;
  webAppUrl: string;
  /** Sent again by the team ("Gửi lại vé"): same tickets, one more line. */
  resend?: boolean;
};

/**
 * Ticket email (docs/05 §5.3): event, schedule, place or online link (which only ever
 * appears here and on the ticket page), ticket types, order code and status, one QR per
 * ticket with its code (inline `cid:` images, never stored), a button to `/ve/[token]`,
 * the safety notes when the event has some, and a sign-up nudge for guests. The booker
 * only, never attendee names (BR-13). TODO(phase-6): `.ics` attachment.
 */
export function ticketEmail(input: TicketEmailInput) {
  const { order, event, tickets, ticketPageUrl, webAppUrl, resend = false } = input;
  const schedule = formatSchedule(event.startAt, event.endAt);
  const free = order.amount === 0;
  const status = free ? "Đã xác nhận" : "Đã thanh toán";
  const total = free ? "Miễn phí" : MONEY.format(order.amount);
  const lines = order.items.map((item) => `${item.quantity} × ${item.name}`);
  const online = event.format === "online";
  const place = online
    ? (event.onlineUrl ?? "Trực tuyến")
    : event.venue
      ? `${event.venue.name}, ${event.venue.address}`
      : "";
  const guest = order.userId === null;
  const signUpUrl = new URL("/dang-ky", webAppUrl).toString();
  const safetyNotes = event.safetyNotes.trim();
  const greeting = `Xin chào ${order.buyer.fullName},`;
  const intro = resend
    ? `LAVIECO gửi lại vé "${event.title}" theo yêu cầu. Vé và mã QR không thay đổi.`
    : `Cảm ơn bạn đã đăng ký "${event.title}". Mỗi vé dưới đây có một mã QR riêng để check-in tại cửa.`;

  const placeHtml =
    online && event.onlineUrl ? emailLink(event.onlineUrl, event.onlineUrl) : escapeHtml(place);
  const bodyHtml = [
    emailParagraph(`${escapeHtml(greeting)}<br>${escapeHtml(intro)}`),
    emailPanel(
      emailSubheading(event.title) +
        emailDetails([
          ["Thời gian", escapeHtml(schedule)],
          [online ? "Tham gia" : "Địa điểm", placeHtml],
          ["Vé", lines.map(escapeHtml).join("<br>")],
          ["Tổng", escapeHtml(total)],
          ["Mã đơn", String(order.orderCode)],
        ]),
    ),
    emailButton("Xem vé trực tuyến", ticketPageUrl),
    emailSubheading(`Vé của bạn (${tickets.length})`),
    tickets.map((ticket, index) => ticketBlock(ticket, index, tickets.length)).join(""),
    safetyNotes
      ? emailPanel(
          emailSubheading("Lưu ý an toàn") + emailParagraph(multiline(safetyNotes)),
          "canary",
        )
      : "",
    emailParagraph(escapeHtml(KEEP_SAFE), { muted: true, small: true }),
    guest
      ? emailPanel(
          emailSubheading("Lưu vé vào tài khoản LAVIECO") +
            emailParagraph(
              'Tạo tài khoản bằng chính email này để xem lại mọi vé ở mục "Vé của tôi" mà không cần tìm lại email.',
            ) +
            emailSecondaryButton("Tạo tài khoản", signUpUrl),
          "plain",
        )
      : "",
  ].join("\n");

  const textLines = [
    greeting,
    intro,
    "",
    event.title,
    `Thời gian: ${schedule}`,
    `${online ? "Tham gia" : "Địa điểm"}: ${place}`,
    `Vé: ${lines.join(", ")}`,
    `Tổng: ${total}`,
    `Mã đơn: ${order.orderCode} · ${status}`,
    "",
    `Xem vé và mã QR: ${ticketPageUrl}`,
    "",
    ...tickets.map(
      (ticket, index) =>
        `Vé ${index + 1}/${tickets.length} · ${ticket.ticketTypeName}: ${ticket.code}`,
    ),
    ...(safetyNotes ? ["", "Lưu ý an toàn:", safetyNotes] : []),
    "",
    KEEP_SAFE,
    ...(guest
      ? [
          "",
          `Tạo tài khoản bằng chính email này để xem lại mọi vé ở mục "Vé của tôi": ${signUpUrl}`,
        ]
      : []),
  ];

  return renderEmail({
    subject: resend ? `Gửi lại vé: ${event.title}` : `Vé của bạn: ${event.title}`,
    preheader: `${tickets.length} vé · ${SHORT_DATE.format(event.startAt)} · Mã đơn ${order.orderCode}`,
    eyebrow: status,
    heading: resend ? "Gửi lại vé của bạn" : "Vé của bạn đã sẵn sàng",
    bodyHtml,
    textLines,
    reason: `Bạn nhận email này vì đã đặt vé "${event.title}" trên website LAVIECO bằng địa chỉ email này.`,
    siteUrl: webAppUrl,
  });
}

/** A ticket's QR as an inline attachment. */
export const qrAttachment = (ticket: TicketRecord, png: Buffer): EmailAttachment => ({
  filename: `${ticket.code}.png`,
  content: png,
  contentType: "image/png",
  cid: qrCid(ticket),
});
