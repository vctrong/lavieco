import type { Metadata } from "next";

import { requireStaff } from "@/features/shell";
import { TICKETING_TEXT, RegistrationsPage, loadRegistrations } from "@/features/ticketing";

export const metadata: Metadata = { title: TICKETING_TEXT.vi.registrations.eyebrow };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function RegistrationsRoute({
  params,
  searchParams,
}: PageProps<"/events/[id]/registrations">) {
  const { id } = await params;
  const search = await searchParams;
  const query = {
    q: first(search.q),
    includeRefunded: first(search.includeRefunded) === "true",
    cursor: first(search.cursor),
  };
  const [staff, { event, list }] = await Promise.all([
    requireStaff(`/events/${id}/registrations`),
    loadRegistrations(id, query),
  ]);
  return <RegistrationsPage event={event} list={list} staff={staff} query={query} />;
}
