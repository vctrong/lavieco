import Link from "next/link";
import { FiArrowLeft, FiArrowRight, FiCalendar } from "react-icons/fi";

import type { CheckinStats, EventListItem, EventView } from "@lavieco/shared/events";

import { TEXT } from "../constants/text";
import { formatDateTime } from "../utils/format";
import { CheckinScanner } from "./checkin-scanner";
import { PageHeader } from "./page-header";

/** `/checkin` (`checkin:perform`): pick the event being scanned. */
export function CheckinPickPage({ events }: { events: EventListItem[] }) {
  const t = TEXT.vi.checkin;
  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} intro={t.pickIntro} />
      {events.length === 0 ? (
        <p className="rounded-3xl border border-hairline bg-white p-8 text-center text-[14px] text-charcoal/65">
          {t.pickEmpty}
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/checkin/${event.id}`}
                className="flex h-full items-center justify-between gap-4 rounded-3xl border border-hairline bg-white p-5 transition-colors hover:border-emerald-brand"
              >
                <span>
                  <span className="block font-semibold text-deep-blue">{event.title}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[13px] text-charcoal/65">
                    <FiCalendar aria-hidden="true" size={13} />
                    {formatDateTime(event.startAt)}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-deep-blue">
                  {t.open}
                  <FiArrowRight aria-hidden="true" size={14} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** `/checkin/[eventId]`: the scanner of one event. */
export function CheckinScanPage({ event, stats }: { event: EventView; stats: CheckinStats }) {
  const t = TEXT.vi.checkin;
  return (
    <>
      <PageHeader
        back={
          <Link
            href="/checkin"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-deep-blue/70 hover:text-deep-blue"
          >
            <FiArrowLeft aria-hidden="true" size={14} />
            {t.back}
          </Link>
        }
        eyebrow={t.title}
        title={event.title}
        intro={formatDateTime(event.startAt)}
      />
      <CheckinScanner eventId={event.id} initialStats={stats} />
    </>
  );
}
