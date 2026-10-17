import Link from "next/link";
import { FiArrowRight, FiCalendar, FiMapPin, FiVideo } from "react-icons/fi";

import type { PublicEventCard } from "@lavieco/shared/events";
import { Button, Container, Eyebrow, PearlDot, SectionHeader } from "@lavieco/ui";

import { EVENTS_PATH, PAST_PAGE_SIZE, UPCOMING_PAGE_SIZE } from "../constants/config";
import { TEXT } from "../constants/text";
import { listEvents, listEventTypes, type EventFilters as Filters } from "../server/events";
import { formatSchedule } from "../utils/format";
import { AvailabilityTag, EventCard, priceLabel } from "./event-card";
import { CoverArt } from "./cover-art";
import { EventFilters } from "./event-filters";
import { LadderStrip } from "./ladder-strip";

function Featured({ event }: { event: PublicEventCard }) {
  const t = TEXT.vi;
  const Place = event.format === "online" ? FiVideo : FiMapPin;
  return (
    <article className="grid overflow-hidden rounded-arch-sm border border-hairline bg-white shadow-gallery md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="p-4 md:p-5">
        <CoverArt
          title={event.title}
          cover={event.cover}
          label={event.type?.name.vi}
          sizes="(min-width: 768px) 50vw, 100vw"
          className="aspect-[5/4] w-full md:h-full"
        />
      </div>
      <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-canary/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-museum text-deep-blue">
            <PearlDot size="sm" tone="emerald" />
            {t.featured.label}
          </span>
          <AvailabilityTag availability={event.availability} />
        </div>
        <h2 className="font-display text-3xl leading-tight text-deep-blue md:text-4xl">
          {event.title}
        </h2>
        {event.summary ? (
          <p className="text-[15px] leading-relaxed text-charcoal/75">{event.summary}</p>
        ) : null}
        <div className="space-y-2 text-[14px] text-charcoal/80">
          <p className="flex items-start gap-2">
            <FiCalendar
              aria-hidden="true"
              size={15}
              className="mt-0.5 shrink-0 text-emerald-brand"
            />
            {formatSchedule(event.startAt, event.endAt)}
          </p>
          <p className="flex items-start gap-2">
            <Place aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-emerald-brand" />
            {event.format === "online"
              ? t.card.online
              : event.venue
                ? `${event.venue.name}, ${event.venue.address}`
                : null}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5">
          <span className="font-display text-2xl text-deep-blue">{priceLabel(event)}</span>
          <Button as={Link} href={`${EVENTS_PATH}/${event.slug}`}>
            {t.featured.cta}
            <FiArrowRight aria-hidden="true" size={15} />
          </Button>
        </div>
      </div>
    </article>
  );
}

/**
 * `/chuong-trinh`: the event list (docs/05 decision), with the four value steps in one
 * strip on top, filters, upcoming events and the archive of past events.
 */
export async function EventsPage({ filters }: { filters: Filters }) {
  const t = TEXT.vi;
  const filtered = Object.values(filters).some(Boolean);
  const [upcoming, past, types] = await Promise.all([
    listEvents("upcoming", filters, UPCOMING_PAGE_SIZE),
    listEvents("past", {}, PAST_PAGE_SIZE),
    listEventTypes(),
  ]);
  const featured = !filtered ? upcoming.items[0] : undefined;
  const grid = featured ? upcoming.items.slice(1) : upcoming.items;

  return (
    <>
      <section className="bg-soft-white pt-dock-clearance">
        <Container className="pb-12 pt-10 md:pt-16">
          <Eyebrow className="mb-4 flex items-center gap-2">
            <PearlDot size="sm" tone="emerald" />
            {t.hero.eyebrow}
          </Eyebrow>
          <h1 className="max-w-3xl font-display text-5xl font-light leading-tight tracking-tight text-deep-blue md:text-7xl">
            {t.hero.title} <em className="text-emerald-brand">{t.hero.titleAccent}</em>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-charcoal/75 md:text-lg">
            {t.hero.intro}
          </p>
          <div className="mt-10">
            <LadderStrip />
          </div>
        </Container>
      </section>

      <section id="lich" className="scroll-mt-24 bg-soft-white pb-24">
        <Container>
          {featured ? (
            <div className="mb-14">
              <Featured event={featured} />
            </div>
          ) : null}
          <SectionHeader kicker={t.filters.label} title={t.list.title} className="mb-8" />
          <EventFilters filters={filters} types={types} />
          {grid.length > 0 ? (
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {grid.map((event) => (
                <li key={event.slug}>
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          ) : featured ? null : (
            <p className="rounded-3xl border border-dashed border-hairline px-6 py-14 text-center text-[15px] text-charcoal/65">
              {t.list.empty}
            </p>
          )}
          {upcoming.nextCursor ? (
            <div className="mt-10 flex justify-center">
              <Button
                as={Link}
                variant="secondary"
                href={`${EVENTS_PATH}?${new URLSearchParams({
                  ...Object.fromEntries(
                    Object.entries(filters).filter(([, value]) => Boolean(value)),
                  ),
                  cursor: upcoming.nextCursor,
                }).toString()}#lich`}
              >
                {t.list.more}
              </Button>
            </div>
          ) : null}
        </Container>
      </section>

      <section
        aria-labelledby="da-dien-ra"
        className="border-t border-hairline bg-mint-mist/50 py-24"
      >
        <Container>
          <SectionHeader kicker={t.hero.eyebrow} title={t.list.pastTitle} className="mb-10">
            <p id="da-dien-ra" className="mt-4 max-w-sm text-[14px] text-charcoal/70 md:mt-0">
              {t.list.pastIntro}
            </p>
          </SectionHeader>
          {past.items.length > 0 ? (
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {past.items.map((event) => (
                <li key={event.slug}>
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-charcoal/65">{t.list.pastEmpty}</p>
          )}
        </Container>
      </section>
    </>
  );
}
