import type { Metadata } from "next";

import { NewEventPage, loadEventTypes } from "@/features/events";
import { requireStaff } from "@/features/shell";

export const metadata: Metadata = { title: "Tạo chương trình" };

export default async function NewEventRoute() {
  const [staff, types] = await Promise.all([requireStaff(), loadEventTypes()]);
  return <NewEventPage staff={staff} types={types} />;
}
