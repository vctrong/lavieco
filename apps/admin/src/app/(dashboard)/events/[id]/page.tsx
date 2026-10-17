import type { Metadata } from "next";

import { EditEventPage, loadEvent } from "@/features/events";
import { requireStaff } from "@/features/shell";

export const metadata: Metadata = { title: "Chỉnh sửa chương trình" };

export default async function EditEventRoute({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const [staff, { event, types }] = await Promise.all([requireStaff(), loadEvent(id)]);
  return <EditEventPage staff={staff} event={event} types={types} />;
}
