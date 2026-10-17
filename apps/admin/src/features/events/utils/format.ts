/** Asia/Ho_Chi_Minh is UTC+7 all year; admins type local times in `datetime-local`. */
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/** `2026-11-15T09:00` (Vietnam time) → ISO UTC, or null when the input is not a date. */
export function vietnamLocalToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const utc = Date.parse(`${value}:00.000Z`);
  return Number.isNaN(utc) ? null : new Date(utc - VIETNAM_OFFSET_MS).toISOString();
}

/** ISO UTC → `2026-11-15T09:00` in Vietnam time, for a `datetime-local` input. */
export function isoToVietnamLocal(iso: string | null): string {
  if (!iso) return "";
  return new Date(Date.parse(iso) + VIETNAM_OFFSET_MS).toISOString().slice(0, 16);
}

const dateTime = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const time = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
});
const day = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** `15/11/2026 · 09:00–12:00`, or two full dates when it spans several days. */
export function formatRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (day.format(start) === day.format(end)) {
    return `${day.format(start)} · ${time.format(start)}–${time.format(end)}`;
  }
  return `${dateTime.format(start)} – ${dateTime.format(end)}`;
}

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

/** Whole VND (docs/03 §1.2). */
export function formatVnd(amount: number): string {
  return money.format(amount);
}
