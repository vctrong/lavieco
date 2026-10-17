import type { Metadata } from "next";

import { EventsListPage, loadEventList, type EventListFilters } from "@/features/events";
import { requireStaff } from "@/features/shell";

export const metadata: Metadata = { title: "Chương trình" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function EventsRoute({ searchParams }: PageProps<"/events">) {
  const params = await searchParams;
  const filters: EventListFilters = {
    status: first(params.status),
    typeId: first(params.typeId),
    format: first(params.format),
    kind: first(params.kind),
    q: first(params.q),
    cursor: first(params.cursor),
  };
  const [staff, { page, types }] = await Promise.all([requireStaff(), loadEventList(filters)]);
  return <EventsListPage staff={staff} filters={filters} page={page} types={types} />;
}
