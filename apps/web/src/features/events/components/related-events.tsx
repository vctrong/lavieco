import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import type { PublicEventCard } from "@lavieco/shared/events";

import { EVENTS_PATH } from "../constants/config";
import { TEXT } from "../constants/text";
import { EventCard } from "./event-card";

/** "Chương trình khác" at the end of an event page; nothing when there is none. */
export function RelatedEvents({ events }: { events: PublicEventCard[] }) {
  const t = TEXT.vi.detail;
  if (events.length === 0) return null;
  return (
    <section aria-labelledby="chuong-trinh-khac" className="mt-24">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2
          id="chuong-trinh-khac"
          className="font-display text-headline-sm text-deep-blue md:text-headline-md"
        >
          {t.related}
        </h2>
        <Link
          href={EVENTS_PATH}
          className="flex items-center gap-1.5 text-label-caps uppercase text-emerald-ink hover:text-deep-blue"
        >
          {t.relatedAll}
          <FiArrowRight aria-hidden="true" size={13} />
        </Link>
      </div>
      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <li key={event.slug}>
            <EventCard event={event} />
          </li>
        ))}
      </ul>
    </section>
  );
}
