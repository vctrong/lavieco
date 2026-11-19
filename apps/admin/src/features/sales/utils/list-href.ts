import type { SalesOrderView } from "@lavieco/shared/sales";

export type SalesListFilters = {
  view: SalesOrderView;
  q?: string;
  status?: string;
  paymentStatus?: string;
  orderType?: string;
  assigneeId?: string;
  from?: string;
  to?: string;
  sort?: string;
  dir?: string;
  deleted?: boolean;
  id?: string;
};

/** Query string of the list with some filters changed; empty values are dropped. */
export function listHref(filters: SalesListFilters, change: Partial<Record<string, string>>) {
  const entries = Object.entries({
    ...filters,
    deleted: filters.deleted ? "true" : "",
    ...change,
  }).filter(([, value]) => typeof value === "string" && value !== "" && value !== "all");
  const query = new URLSearchParams(entries as [string, string][]).toString();
  return query ? `/sales?${query}` : "/sales";
}
