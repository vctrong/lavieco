import Link from "next/link";
import type { ReactNode } from "react";
import { FiArrowLeft } from "react-icons/fi";

import type { EventType, EventView } from "@lavieco/shared/events";
import type { StaffProfile } from "@lavieco/shared/identity";
import { can } from "@lavieco/shared/permissions";

import { TEXT } from "../constants/text";
import { formatRange } from "../utils/format";
import { DetailsForm } from "./details-form";
import { EventEditor } from "./event-editor";
import { PageHeader } from "./page-header";

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-deep-blue/70 hover:text-deep-blue"
    >
      <FiArrowLeft aria-hidden="true" size={13} />
      {label}
    </Link>
  );
}

/** `/events/new`: details only; tickets and the form open after the first save. */
export function NewEventPage({ staff, types }: { staff: StaffProfile; types: EventType[] }) {
  const t = TEXT.vi.editor;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={TEXT.vi.list.eyebrow}
        title={t.newTitle}
        intro={t.newIntro}
        back={<BackLink href="/events" label={t.backToList} />}
      />
      <DetailsForm event={null} types={types} canWrite={can(staff, "program:write")} />
    </div>
  );
}

/** `/events/[id]`: full editor. */
export function EditEventPage({
  staff,
  event,
  types,
  vouchersSection,
  surveysSection,
}: {
  staff: StaffProfile;
  event: EventView;
  types: EventType[];
  vouchersSection?: ReactNode;
  surveysSection?: ReactNode;
}) {
  const t = TEXT.vi;
  return (
    <div className="mx-auto max-w-[90rem]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <BackLink href="/events" label={t.editor.backToList} />
        <p className="text-[12.5px] text-charcoal/65">
          {/* Only archive-only events need a label; standard events are the default. */}
          {event.kind === "past" ? `${t.kind.past} · ` : null}
          {formatRange(event.startAt, event.endAt)}
        </p>
      </div>
      <EventEditor
        event={event}
        types={types}
        canWrite={can(staff, "program:write")}
        canApprove={can(staff, "impact:approve")}
        vouchersSection={vouchersSection}
        surveysSection={surveysSection}
      />
    </div>
  );
}
