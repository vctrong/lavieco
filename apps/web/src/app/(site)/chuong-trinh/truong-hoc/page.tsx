import type { Metadata } from "next";

import { OrganizationLeadForm } from "@/features/contact";
import { EVENTS_TEXT, SchoolPage } from "@/features/events";

export const metadata: Metadata = {
  title: EVENTS_TEXT.vi.meta.schoolTitle,
  description: EVENTS_TEXT.vi.meta.schoolDescription,
};

/** UC-06 form, moved from /chuong-trinh (docs/05 decision). */
export default function SchoolRoute() {
  return <SchoolPage form={<OrganizationLeadForm />} />;
}
