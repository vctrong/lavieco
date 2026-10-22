import Link from "next/link";
import { FiArrowRight, FiCalendar, FiUsers, FiXCircle } from "react-icons/fi";

import type { EventCancellation } from "@lavieco/shared/events";

import { EVENTS_PATH } from "../constants/config";
import { TEXT } from "../constants/text";
import { formatSchedule } from "../utils/format";

const upcomingLink = (
  <Link
    href={EVENTS_PATH}
    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-brand px-6 py-3 text-sm font-bold text-charcoal shadow-emerald-cta transition-transform hover:scale-[1.02] motion-reduce:transition-none"
  >
    {TEXT.vi.summary.upcoming}
    <FiArrowRight aria-hidden="true" size={15} />
  </Link>
);

/** In place of the ticket box once the programme took place: date, attendance, next ones. */
export function SummaryCard({
  startAt,
  endAt,
  attendeeCount,
}: {
  startAt: string;
  endAt: string;
  attendeeCount: number | null;
}) {
  const t = TEXT.vi.summary;
  return (
    <section
      aria-labelledby="tong-ket"
      className="rounded-pedestal bg-deep-blue p-6 text-soft-white shadow-gallery"
    >
      <h2 id="tong-ket" className="font-display text-headline-sm">
        {t.title}
      </h2>
      <dl className="mt-5 space-y-4 text-body-md">
        <div className="flex items-start gap-3">
          <FiCalendar aria-hidden="true" size={16} className="mt-1 shrink-0 text-mint-mist" />
          <div>
            <dt className="text-meta uppercase text-mint-mist/80">{t.date}</dt>
            <dd>{formatSchedule(startAt, endAt)}</dd>
          </div>
        </div>
        {attendeeCount !== null ? (
          <div className="flex items-start gap-3">
            <FiUsers aria-hidden="true" size={16} className="mt-1 shrink-0 text-mint-mist" />
            <div>
              <dt className="text-meta uppercase text-mint-mist/80">{t.attendees}</dt>
              <dd className="font-display text-headline-sm">{attendeeCount}</dd>
            </div>
          </div>
        ) : null}
      </dl>
      {upcomingLink}
    </section>
  );
}

/** In place of the ticket box when the team cancelled the programme. */
export function CancelledCard({ cancellation }: { cancellation: EventCancellation | null }) {
  const t = TEXT.vi.detail;
  return (
    <section
      aria-labelledby="da-huy"
      className="rounded-pedestal border border-charcoal/20 bg-white p-6 shadow-gallery"
    >
      <h2
        id="da-huy"
        className="flex items-center gap-2 font-display text-headline-sm text-deep-blue"
      >
        <FiXCircle aria-hidden="true" size={20} />
        {t.cancelledTitle}
      </h2>
      {cancellation?.reason ? (
        <p className="mt-4 whitespace-pre-line text-body-md text-charcoal">{cancellation.reason}</p>
      ) : null}
      <p className="mt-3 text-body-sm text-charcoal/70">{t.cancelledNote}</p>
      {upcomingLink}
    </section>
  );
}
