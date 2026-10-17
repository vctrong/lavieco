const TIME_ZONE = "Asia/Ho_Chi_Minh";

const weekdayDate = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const shortDate = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const clock = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export const formatVnd = (amount: number) => money.format(amount);

/** `Chủ Nhật, 15/11/2026 · 09:00–12:00`, or two dates for a multi-day event. */
export function formatSchedule(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (shortDate.format(start) === shortDate.format(end)) {
    return `${weekdayDate.format(start)} · ${clock.format(start)}–${clock.format(end)}`;
  }
  return `${shortDate.format(start)} – ${shortDate.format(end)}`;
}

/** `Chủ Nhật, 15/11/2026` in Vietnam time. */
export const formatDate = (iso: string) => weekdayDate.format(new Date(iso));

/** `09:12, 20/10/2026` in Vietnam time (check-in time on a ticket). */
export const formatDateTime = (iso: string) =>
  `${clock.format(new Date(iso))}, ${shortDate.format(new Date(iso))}`;

/** `mm:ss` left until `untilIso` (00:00 once passed). */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}
