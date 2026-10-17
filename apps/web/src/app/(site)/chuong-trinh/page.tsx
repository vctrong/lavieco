import type { Metadata } from "next";

import { EVENTS_TEXT, EventsPage, type EventFilters } from "@/features/events";

export const metadata: Metadata = {
  title: EVENTS_TEXT.vi.meta.listTitle,
  description: EVENTS_TEXT.vi.meta.listDescription,
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function ProgramsRoute({ searchParams }: PageProps<"/chuong-trinh">) {
  const params = await searchParams;
  const filters: EventFilters = {
    typeId: first(params.typeId),
    format: first(params.format),
    free: first(params.free),
    month: first(params.month),
    cursor: first(params.cursor),
  };
  return <EventsPage filters={filters} />;
}
