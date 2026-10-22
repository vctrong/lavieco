import Link from "next/link";
import { FiArrowRight, FiCalendar, FiMapPin, FiVideo } from "react-icons/fi";

import type { PublicEventCard } from "@lavieco/shared/events";

import { eventPath } from "../constants/config";
import { TEXT } from "../constants/text";
import { formatSchedule } from "../utils/format";
import { cardPrice } from "./event-card";
import { EventImage } from "./event-image";
import { StateBadge } from "./state-badge";

/**
 * The soonest programme people can still book, on its 21:9 banner (4:5 poster crop on
 * phones). Text sits on a Charcoal veil so Soft White stays readable on any photo.
 */
export function FeaturedBanner({ event }: { event: PublicEventCard }) {
  const t = TEXT.vi;
  const Place = event.format === "online" ? FiVideo : FiMapPin;
  const price = cardPrice(event);
  return (
    <article className="relative overflow-hidden rounded-[2rem] bg-charcoal shadow-gallery">
      <EventImage
        title={event.title}
        image={event.banner ?? event.cover}
        sizes="(min-width: 1280px) 1200px, 100vw"
        preload
        className="aspect-[4/5] w-full sm:aspect-[16/9] lg:aspect-[21/9]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/45 to-charcoal/5"
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-6 md:max-w-3xl md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-soft-white px-2.5 py-1 text-meta font-semibold uppercase text-deep-blue">
            {t.featured.label}
          </span>
          <StateBadge state={event.state} availability={event.availability} />
        </div>
        <h2 className="font-display text-headline-lg-mobile text-soft-white md:text-headline-lg">
          {event.title}
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-soft-white/90">
          <p className="flex items-center gap-2">
            <FiCalendar aria-hidden="true" size={14} />
            {formatSchedule(event.startAt, event.endAt)}
          </p>
          <p className="flex items-center gap-2">
            <Place aria-hidden="true" size={14} />
            {event.format === "online" ? t.card.online : event.venue?.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={eventPath(event.slug)}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-brand px-6 py-3 text-sm font-bold text-charcoal shadow-emerald-cta transition-transform hover:scale-[1.02] motion-reduce:transition-none"
          >
            {t.featured.cta}
            <FiArrowRight aria-hidden="true" size={15} />
          </Link>
          {price ? <span className="font-display text-xl text-soft-white">{price}</span> : null}
        </div>
      </div>
    </article>
  );
}
