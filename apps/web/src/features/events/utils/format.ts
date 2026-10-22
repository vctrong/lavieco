import type { PublicEventCard, PublicPriceRange } from "@lavieco/shared/events";

/** Every date on these pages is shown and grouped in Vietnam time. */
export const TIME_ZONE = "Asia/Ho_Chi_Minh";
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

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
const dayOfMonth = new Intl.DateTimeFormat("vi-VN", { timeZone: TIME_ZONE, day: "2-digit" });
const weekdayShort = new Intl.DateTimeFormat("vi-VN", { timeZone: TIME_ZONE, weekday: "short" });
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export const formatVnd = (amount: number) => money.format(amount);

export const formatShortDate = (iso: string) => shortDate.format(new Date(iso));

/** `09:00–12:00`, or the two dates for an event over several days. */
export function formatTimeRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (shortDate.format(start) === shortDate.format(end)) {
    return `${clock.format(start)}–${clock.format(end)}`;
  }
  return `${shortDate.format(start)} – ${shortDate.format(end)}`;
}

/** `Chủ Nhật, 15/11/2026 · 09:00–12:00`, or two dates for a multi-day event. */
export function formatSchedule(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (shortDate.format(start) === shortDate.format(end)) {
    return `${weekdayDate.format(start)} · ${clock.format(start)}–${clock.format(end)}`;
  }
  return `${shortDate.format(start)} – ${shortDate.format(end)}`;
}

/** Day of month and short weekday for the date tile of a card (`15`, `T7`). */
export function dateTile(iso: string): { day: string; weekday: string } {
  const date = new Date(iso);
  return { day: dayOfMonth.format(date), weekday: weekdayShort.format(date) };
}

/** Plain-text description → paragraphs (blank-line separated). Never HTML. */
export function paragraphsOf(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** `2026-11` of a date in Vietnam time. */
export function monthKeyOf(iso: string | Date): string {
  const local = new Date(new Date(iso).getTime() + VN_OFFSET_MS);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** `2026-11` for the current and next months in Vietnam time (month filter options). */
export function upcomingMonths(count: number, now = new Date()): string[] {
  const local = new Date(now.getTime() + VN_OFFSET_MS);
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

export function monthParts(month: string): { month: number; year: number } {
  const [year, value] = month.split("-");
  return { month: Number(value), year: Number(year) };
}

/** Events grouped by their start month in Vietnam time, keeping the list order. */
export function groupByMonth<T extends Pick<PublicEventCard, "startAt">>(
  events: readonly T[],
): { month: string; events: T[] }[] {
  const groups: { month: string; events: T[] }[] = [];
  for (const event of events) {
    const month = monthKeyOf(event.startAt);
    const last = groups.at(-1);
    if (last?.month === month) last.events.push(event);
    else groups.push({ month, events: [event] });
  }
  return groups;
}

/**
 * Price line of a card or ticket box: "Miễn phí" when every ticket is free, "Từ X"
 * only when ticket prices differ, else the single price. Null without tickets.
 */
export function priceText(
  price: PublicPriceRange | null,
  labels: { free: string; from: (price: string) => string },
): string | null {
  if (!price) return null;
  if (price.max === 0) return labels.free;
  if (price.min !== price.max) return labels.from(formatVnd(price.min));
  return formatVnd(price.min);
}

/**
 * Length of the event from its own times: minutes or hours on one day ("2,5 giờ"),
 * days when it spans several calendar days in Vietnam time.
 */
export type Duration =
  | { unit: "minutes"; value: number }
  | { unit: "hours"; value: string }
  | { unit: "days"; value: number };

/** Calendar day number of an instant in Vietnam time. */
const vnDay = (date: Date) => Math.floor((date.getTime() + VN_OFFSET_MS) / 86_400_000);

export function durationOf(startIso: string, endIso: string): Duration {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (vnDay(start) !== vnDay(end)) {
    return { unit: "days", value: vnDay(end) - vnDay(start) + 1 };
  }
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (minutes < 60) return { unit: "minutes", value: minutes };
  const hours = Math.round((minutes / 60) * 10) / 10;
  return { unit: "hours", value: hours.toLocaleString("vi-VN") };
}
