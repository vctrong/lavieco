import type { EventRecord } from "../../events";
import type { OrderRecord } from "../domain/order";
import type { TicketRecord } from "../domain/ticket";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const DATE_TIME = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const SIGNATURE = "LAVIECO · Giáo dục sáng tạo xanh, thông qua nghệ thuật";

export const qrCid = (ticket: Pick<TicketRecord, "code">) => `qr-${ticket.code}@lavieco`;

/**
 * Ticket email (docs/05 §5.3): event, time, place (or the online link, which only ever
 * appears in this email and on the ticket page), one QR per ticket with its code, and
 * a "Xem vé" button to `/ve/[token]`. QR images are attached inline (`cid:`), never
 * stored. TODO(phase-6): CTA to save the tickets into an account; `.ics` attachment.
 */
export function ticketEmail(input: {
  order: OrderRecord;
  event: EventRecord;
  tickets: TicketRecord[];
  ticketPageUrl: string;
}) {
  const { order, event, tickets, ticketPageUrl } = input;
  const when = `${DATE_TIME.format(event.startAt)} – ${DATE_TIME.format(event.endAt)}`;
  const where =
    event.format === "online"
      ? `Trực tuyến: ${event.onlineUrl ?? ""}`
      : event.venue
        ? `${event.venue.name}, ${event.venue.address}`
        : "";
  const subject = `Vé của bạn: ${event.title}`;
  const text = [
    `Xin chào ${order.buyer.fullName},`,
    "",
    `Cảm ơn bạn đã đăng ký "${event.title}". Đây là vé của bạn (mã đơn ${order.orderCode}).`,
    "",
    `Thời gian: ${when}`,
    `Địa điểm: ${where}`,
    "",
    ...tickets.map((ticket) => `• ${ticket.ticketTypeName}: ${ticket.code}`),
    "",
    `Xem vé và mã QR: ${ticketPageUrl}`,
    "Mỗi vé có một mã QR riêng, chỉ dùng được một lần khi check-in. Đừng chia sẻ mã QR cho người khác.",
    "",
    SIGNATURE,
  ].join("\n");

  const ticketBlocks = tickets
    .map(
      (
        ticket,
      ) => `<div style="border:1px solid #d9e4df;border-radius:12px;padding:16px;margin:12px 0;text-align:center">
<p style="margin:0 0 8px;font-weight:bold">${escapeHtml(ticket.ticketTypeName)}</p>
<img src="cid:${qrCid(ticket)}" width="200" height="200" alt="Mã QR vé ${escapeHtml(ticket.code)}" />
<p style="margin:8px 0 0;font-size:18px;letter-spacing:2px">${escapeHtml(ticket.code)}</p>
</div>`,
    )
    .join("\n");
  const placeHtml =
    event.format === "online" && event.onlineUrl
      ? `Trực tuyến: <a href="${escapeHtml(event.onlineUrl)}">${escapeHtml(event.onlineUrl)}</a>`
      : escapeHtml(where);
  const html = `<p>Xin chào ${escapeHtml(order.buyer.fullName)},</p>
<p>Cảm ơn bạn đã đăng ký <strong>${escapeHtml(event.title)}</strong>. Đây là vé của bạn (mã đơn ${order.orderCode}).</p>
<p><strong>Thời gian:</strong> ${escapeHtml(when)}<br /><strong>Địa điểm:</strong> ${placeHtml}</p>
${ticketBlocks}
<p style="text-align:center;margin:20px 0"><a href="${escapeHtml(ticketPageUrl)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#10B183;color:#ffffff;text-decoration:none;font-weight:bold">Xem vé</a></p>
<p>Mỗi vé có một mã QR riêng, chỉ dùng được một lần khi check-in. Đừng chia sẻ mã QR cho người khác.</p>
<p>${SIGNATURE}</p>`;
  return { subject, text, html };
}
