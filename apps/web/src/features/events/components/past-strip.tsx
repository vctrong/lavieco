import Link from "next/link";

import type { PublicEventCard } from "@lavieco/shared/events";

import { eventPath } from "../constants/config";
import { TEXT } from "../constants/text";
import { formatShortDate } from "../utils/format";
import { EventImage } from "./event-image";

/** "Đã diễn ra": a compact row of the latest past programmes, or one short line. */
export function PastStrip({ events }: { events: PublicEventCard[] }) {
  const t = TEXT.vi.past;
  return (
    <section aria-labelledby="da-dien-ra" className="mt-20">
      <p className="text-label-caps uppercase text-charcoal/60">{t.kicker}</p>
      <h2 id="da-dien-ra" className="mb-6 mt-1 font-display text-headline-sm text-deep-blue">
        {t.title}
      </h2>
      {events.length === 0 ? (
        <p className="text-body-md text-charcoal/70">{t.empty}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <li key={event.slug}>
              <article className="relative flex items-center gap-4 rounded-pedestal bg-mint-mist/70 p-3 transition-colors hover:bg-mint-mist motion-reduce:transition-none">
                <EventImage
                  title={event.title}
                  image={event.cover}
                  sizes="64px"
                  className="size-16 shrink-0 rounded-xl"
                />
                <div className="min-w-0">
                  <p className="text-meta uppercase text-charcoal/70">
                    {formatShortDate(event.startAt)}
                  </p>
                  <h3 className="line-clamp-2 text-body-md font-semibold text-deep-blue">
                    <Link
                      href={eventPath(event.slug)}
                      className="after:absolute after:inset-0 after:rounded-pedestal focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-emerald-brand"
                    >
                      {event.title}
                    </Link>
                  </h3>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
