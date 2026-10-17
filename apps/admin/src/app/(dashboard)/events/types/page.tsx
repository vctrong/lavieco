import type { Metadata } from "next";

import { EventTypesPage, loadEventTypes } from "@/features/events";
import { requireStaff } from "@/features/shell";
import { can } from "@lavieco/shared/permissions";

export const metadata: Metadata = { title: "Loại chương trình" };

export default async function EventTypesRoute() {
  const [staff, types] = await Promise.all([requireStaff(), loadEventTypes()]);
  return <EventTypesPage types={types} canWrite={can(staff, "program:write")} />;
}
