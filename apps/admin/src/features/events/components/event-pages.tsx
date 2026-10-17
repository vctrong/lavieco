import Link from "next/link";
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
}: {
  staff: StaffProfile;
  event: EventView;
  types: EventType[];
}) {
  const t = TEXT.vi;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow={`${t.editor.editEyebrow} · ${t.kind[event.kind]}`}
        title={event.title}
        intro={formatRange(event.startAt, event.endAt)}
        back={<BackLink href="/events" label={t.editor.backToList} />}
      />
      <EventEditor event={event} types={types} canWrite={can(staff, "program:write")} />
    </div>
  );
}
