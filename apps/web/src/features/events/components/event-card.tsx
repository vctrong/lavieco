import Link from "next/link";
import { FiArrowRight, FiClock, FiMapPin, FiVideo } from "react-icons/fi";

import type { PublicEventCard } from "@lavieco/shared/events";

import { eventPath } from "../constants/config";
import { TEXT } from "../constants/text";
import { dateTile, formatTimeRange, priceText } from "../utils/format";
import { EventImage } from "./event-image";
import { StateBadge } from "./state-badge";

export const cardPrice = (event: Pick<PublicEventCard, "price">) =>
  priceText(event.price, { free: TEXT.vi.card.free, from: TEXT.vi.card.priceFrom });

/**
 * One programme in the calendar: poster 4:5 with the date tile and the state badge,
 * then type, title, time, place and price. The whole card is one link (the title).
 */
export function EventCard({ event }: { event: PublicEventCard }) {
  const t = TEXT.vi.card;
  const tile = dateTile(event.startAt);
  const Place = event.format === "online" ? FiVideo : FiMapPin;
  const price = cardPrice(event);
  return (
    <article className="group relative flex h-full flex-col rounded-pedestal border border-hairline bg-white p-3 shadow-ambient transition-shadow duration-300 hover:shadow-ambient-hover focus-within:shadow-ambient-hover motion-reduce:transition-none">
      <div className="relative">
        <EventImage
          title={event.title}
          image={event.cover}
          sizes="(min-width: 1024px) 26vw, (min-width: 640px) 44vw, 92vw"
          className="aspect-[4/5] w-full rounded-2xl"
        />
        <p className="absolute left-3 top-3 flex min-w-12 flex-col items-center rounded-xl bg-white/95 px-2 py-1.5 text-deep-blue shadow-ambient">
          <span className="font-display text-xl leading-none">{tile.day}</span>
          <span className="mt-0.5 text-meta uppercase text-charcoal/70">{tile.weekday}</span>
        </p>
        <StateBadge
          state={event.state}
          availability={event.availability}
          className="absolute right-3 top-3"
        />
      </div>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        {event.type ? (
          <p className="mb-1.5 text-label-caps uppercase text-emerald-ink">{event.type.name.vi}</p>
        ) : null}
        <h3 className="font-display text-title-editorial text-deep-blue">
          <Link
            href={eventPath(event.slug)}
            className="after:absolute after:inset-0 after:rounded-pedestal focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-emerald-brand"
          >
            {event.title}
          </Link>
        </h3>
        <div className="mb-4 mt-3 space-y-1.5 text-body-sm text-charcoal/75">
          <p className="flex items-start gap-2">
            <FiClock aria-hidden="true" size={13} className="mt-1 shrink-0 text-emerald-ink" />
            {formatTimeRange(event.startAt, event.endAt)}
          </p>
          {event.venue || event.format === "online" ? (
            <p className="flex items-start gap-2">
              <Place aria-hidden="true" size={13} className="mt-1 shrink-0 text-emerald-ink" />
              <span className="line-clamp-1">
                {event.format === "online" ? t.online : event.venue?.name}
              </span>
            </p>
          ) : null}
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-hairline pt-3">
          {price ? (
            <p>
              <span className="block text-meta uppercase text-charcoal/60">{t.fee}</span>
              <span className="font-display text-lg text-deep-blue">{price}</span>
            </p>
          ) : (
            <span />
          )}
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-full border border-hairline text-deep-blue transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          >
            <FiArrowRight size={15} />
          </span>
        </div>
      </div>
    </article>
  );
}
