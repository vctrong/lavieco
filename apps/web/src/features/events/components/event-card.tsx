import Link from "next/link";
import { FiArrowRight, FiCalendar, FiMapPin, FiVideo } from "react-icons/fi";

import type { PublicAvailability, PublicEventCard } from "@lavieco/shared/events";
import { cn } from "@lavieco/ui";

import { EVENTS_PATH } from "../constants/config";
import { TEXT } from "../constants/text";
import { formatSchedule, formatVnd } from "../utils/format";
import { CoverArt } from "./cover-art";

/** "Còn X chỗ" only for few seats, "Hết chỗ" at zero, nothing for unlimited events. */
export function AvailabilityTag({
  availability,
  className,
}: {
  availability: PublicAvailability;
  className?: string;
}) {
  const t = TEXT.vi.card;
  if (availability.soldOut) {
    return (
      <span
        className={cn(
          "rounded-full bg-deep-blue px-2.5 py-1 text-[11px] font-semibold text-soft-white",
          className,
        )}
      >
        {t.soldOut}
      </span>
    );
  }
  if (availability.seatsLeft === null) return null;
  return (
    <span
      className={cn(
        "rounded-full bg-canary px-2.5 py-1 text-[11px] font-semibold text-deep-blue",
        className,
      )}
    >
      {t.seatsLeft(availability.seatsLeft)}
    </span>
  );
}

export function priceLabel(event: Pick<PublicEventCard, "pricing">): string | null {
  const t = TEXT.vi.card;
  if (event.pricing.isFree) return t.free;
  return event.pricing.priceFrom === null ? null : t.priceFrom(formatVnd(event.pricing.priceFrom));
}

export function EventCard({ event }: { event: PublicEventCard }) {
  const t = TEXT.vi.card;
  const Place = event.format === "online" ? FiVideo : FiMapPin;
  const price = priceLabel(event);
  const statusNote =
    event.status === "closed" ? t.closed : event.status === "ended" ? t.ended : null;
  return (
    <article className="group relative flex h-full flex-col rounded-arch-sm border border-hairline bg-white p-3 shadow-ambient transition-shadow duration-300 hover:shadow-ambient-hover motion-reduce:transition-none">
      <div className="relative">
        <CoverArt
          title={event.title}
          label={event.type?.name.vi}
          radius="arch-sm"
          className="aspect-[4/3.4] w-full"
        />
        <AvailabilityTag availability={event.availability} className="absolute right-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-museum text-deep-blue/60">
          {event.type?.name.vi}
          {event.format === "online" ? ` · ${t.online}` : null}
        </p>
        <h3 className="font-display text-xl leading-snug text-deep-blue">
          <Link
            href={`${EVENTS_PATH}/${event.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {event.title}
          </Link>
        </h3>
        {event.summary ? (
          <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-charcoal/70">
            {event.summary}
          </p>
        ) : null}
        <div className="mb-5 mt-4 space-y-1.5 text-[12.5px] text-charcoal/75">
          <p className="flex items-start gap-2">
            <FiCalendar
              aria-hidden="true"
              size={13}
              className="mt-0.5 shrink-0 text-emerald-brand"
            />
            {formatSchedule(event.startAt, event.endAt)}
          </p>
          {event.venue || event.format === "online" ? (
            <p className="flex items-start gap-2">
              <Place aria-hidden="true" size={13} className="mt-0.5 shrink-0 text-emerald-brand" />
              {event.format === "online" ? t.online : event.venue?.name}
            </p>
          ) : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-4">
          <span className="font-display text-lg text-deep-blue">{statusNote ?? price}</span>
          <span className="flex items-center gap-1 text-[12.5px] font-semibold text-deep-blue transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
            {t.details}
            <FiArrowRight aria-hidden="true" size={13} />
          </span>
        </div>
      </div>
    </article>
  );
}
