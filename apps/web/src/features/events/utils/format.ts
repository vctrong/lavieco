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

export const formatShortDate = (iso: string) => shortDate.format(new Date(iso));

/** `Chủ Nhật, 15/11/2026 · 09:00–12:00`, or two dates for a multi-day event. */
export function formatSchedule(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (shortDate.format(start) === shortDate.format(end)) {
    return `${weekdayDate.format(start)} · ${clock.format(start)}–${clock.format(end)}`;
  }
  return `${shortDate.format(start)} – ${shortDate.format(end)}`;
}

/** Plain-text description → paragraphs (blank-line separated). Never HTML. */
export function paragraphsOf(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** `2026-11` for the current and next months in Vietnam time (month filter options). */
export function upcomingMonths(count: number, now = new Date()): string[] {
  const local = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const months: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const date = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + index, 1));
    months.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export function monthLabel(month: string): string {
  const [year, value] = month.split("-");
  return `Tháng ${Number(value)}/${year}`;
}
