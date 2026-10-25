export type HistoryGroup = "today" | "week" | "older";

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Hôm nay" / "7 ngày qua" / "Cũ hơn", by the visitor's local calendar day. */
export function historyGroupOf(isoDate: string, now: Date = new Date()): HistoryGroup {
  const date = new Date(isoDate).getTime();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date >= startOfToday) return "today";
  if (date >= startOfToday - 6 * DAY_MS) return "week";
  return "older";
}

const ORDER: readonly HistoryGroup[] = ["today", "week", "older"];

/** Non-empty groups in display order; items keep their order (newest first). */
export function groupByDate<T extends { updatedAt: string }>(
  items: readonly T[],
  now: Date = new Date(),
): { group: HistoryGroup; items: T[] }[] {
  return ORDER.map((group) => ({
    group,
    items: items.filter((item) => historyGroupOf(item.updatedAt, now) === group),
  })).filter((entry) => entry.items.length > 0);
}
