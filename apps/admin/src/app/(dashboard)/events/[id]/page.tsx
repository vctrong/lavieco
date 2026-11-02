import type { Metadata } from "next";

import { can } from "@lavieco/shared/permissions";

import { EditEventPage, loadEvent } from "@/features/events";
import { requireStaff } from "@/features/shell";
import { EventSurveysSection, loadEventSurveys } from "@/features/surveys";
import { EventVouchersSection, loadVouchers } from "@/features/vouchers";

export const metadata: Metadata = { title: "Chỉnh sửa chương trình" };

export default async function EditEventRoute({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const [staff, { event, types }] = await Promise.all([requireStaff(), loadEvent(id)]);
  const vouchers =
    can(staff, "voucher:write") && event.kind === "standard"
      ? await loadVouchers({ eventId: id, limit: 50 })
      : null;
  const surveys =
    can(staff, "survey:read") && event.kind === "standard" ? await loadEventSurveys(id) : null;
  return (
    <EditEventPage
      staff={staff}
      event={event}
      types={types}
      vouchersSection={
        vouchers ? <EventVouchersSection eventId={id} vouchers={vouchers.items} /> : undefined
      }
      surveysSection={
        surveys ? (
          <EventSurveysSection
            eventId={id}
            surveys={surveys.surveys}
            checkedIn={surveys.checkedIn}
            canWrite={can(staff, "survey:write")}
          />
        ) : undefined
      }
    />
  );
}
