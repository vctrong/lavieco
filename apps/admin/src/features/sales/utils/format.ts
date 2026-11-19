import type { SalesOrder } from "@lavieco/shared/sales";

const MONEY = new Intl.NumberFormat("vi-VN");

/** `45.000đ`: the way the team writes prices. */
export const money = (amount: number) => `${MONEY.format(amount)}đ`;

/** `2026-11-20` → `20/11`, with the year when it is not this one. */
export function shortDay(day: string | null, thisYear = new Date().getFullYear()) {
  if (!day) return "";
  const [year, month, date] = day.split("-");
  return Number(year) === thisYear ? `${date}/${month}` : `${date}/${month}/${year}`;
}

/** "Khay vỏ sò ×2, Phone charm" — the first lines, the rest counted. */
export function itemsSummary(order: Pick<SalesOrder, "items">, max = 2) {
  const parts = order.items
    .slice(0, max)
    .map((item) => (item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name));
  return { text: parts.join(", "), more: Math.max(0, order.items.length - max) };
}

/** Today in Asia/Ho_Chi_Minh as `YYYY-MM-DD`, the default order day of the form. */
export const vnToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
