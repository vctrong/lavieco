import Link from "next/link";
import {
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUsers,
  FiVideo,
} from "react-icons/fi";

import type { PublicEventCard, PublicEventDetail } from "@lavieco/shared/events";
import { Container } from "@lavieco/ui";

import { EVENTS_PATH, HANDBOOK_PATH, calendarPath } from "../constants/config";
import { TEXT } from "../constants/text";
import { durationOf, formatSchedule, type Duration } from "../utils/format";
import { EventImage } from "./event-image";
import { CancelledCard, SummaryCard } from "./event-outcome";
import { EventSections, Gallery, sectionsOf } from "./event-sections";
import { RelatedEvents } from "./related-events";
import { SectionTabs } from "./section-tabs";
import { StateBadge } from "./state-badge";
import { TicketCard } from "./ticket-card";

const t = TEXT.vi.detail;

function durationText(duration: Duration) {
  if (duration.unit === "days") return t.days(duration.value);
  if (duration.unit === "hours") return t.hours(duration.value);
  return t.minutes(duration.value);
}

function Hero({ event }: { event: PublicEventDetail }) {
  return (
    <header className="relative overflow-hidden rounded-[2rem] bg-charcoal">
      <EventImage
        title={event.title}
        image={event.banner ?? event.cover}
        sizes="(min-width: 1280px) 1200px, 100vw"
        preload
        className="aspect-[4/5] w-full sm:aspect-[16/9] lg:aspect-[21/9]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 p-6 md:max-w-3xl md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          {event.type ? (
            <span className="rounded-full bg-soft-white px-2.5 py-1 text-meta font-semibold uppercase text-deep-blue">
              {event.type.name.vi}
            </span>
          ) : null}
          <StateBadge state={event.state} availability={event.availability} />
        </div>
        <h1 className="mt-4 font-display text-display-hero-mobile text-soft-white md:text-display-hero">
          {event.title}
        </h1>
        {event.summary ? (
          <p className="mt-3 max-w-2xl text-body-md text-soft-white/90 md:text-body-lg">
            {event.summary}
          </p>
        ) : null}
      </div>
    </header>
  );
}

function QuickFacts({ event }: { event: PublicEventDetail }) {
  const place = event.format === "online" ? t.online : event.venue ? event.venue.name : null;
  const seats =
    event.state === "few_left" && event.availability.seatsLeft
      ? TEXT.vi.card.seatsLeft(event.availability.seatsLeft)
      : event.state === "open"
        ? t.seatsOpen
        : TEXT.vi.state[event.state];
  const facts: { key: string; icon: typeof FiCalendar; label: string; value: string }[] = [
    {
      key: "when",
      icon: FiCalendar,
      label: t.facts.when,
      value: formatSchedule(event.startAt, event.endAt),
    },
    ...(place
      ? [
          {
            key: "where",
            icon: event.format === "online" ? FiVideo : FiMapPin,
            label: t.facts.where,
            value: place,
          },
        ]
      : []),
    {
      key: "duration",
      icon: FiClock,
      label: t.facts.duration,
      value: durationText(durationOf(event.startAt, event.endAt)),
    },
    ...(event.kind === "standard"
      ? [{ key: "seats", icon: FiUsers, label: t.facts.seats, value: seats }]
      : []),
    ...(event.minAge !== null
      ? [{ key: "age", icon: FiUsers, label: t.facts.age, value: t.minAge(event.minAge) }]
      : []),
  ];
  return (
    <dl
      aria-label={t.facts.label}
      className="-mt-6 relative z-10 mx-4 grid grid-cols-2 gap-x-6 gap-y-4 rounded-pedestal border border-hairline bg-white p-5 shadow-ambient md:mx-8 md:grid-cols-3 lg:grid-cols-5"
    >
      {facts.map(({ key, icon: Icon, label, value }) => (
        <div key={key} className="min-w-0">
          <dt className="flex items-center gap-1.5 text-meta uppercase text-charcoal/65">
            <Icon aria-hidden="true" size={12} className="text-emerald-ink" />
            {label}
          </dt>
          <dd className="mt-1 text-body-sm font-semibold text-deep-blue">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EducationNote() {
  return (
    <section className="rounded-pedestal bg-mint-mist p-5">
      <p className="text-body-sm text-deep-blue">{t.educationNote}</p>
      <Link
        href={HANDBOOK_PATH}
        className="mt-3 inline-flex items-center gap-2 text-body-sm font-semibold text-emerald-ink hover:text-deep-blue"
      >
        <FiBookOpen aria-hidden="true" size={14} />
        {t.handbookCta}
        <FiArrowRight aria-hidden="true" size={13} />
      </Link>
    </section>
  );
}

export type EventDetailProps = {
  event: PublicEventDetail;
  /** The preview never links to the checkout. */
  preview?: boolean;
  attendeeCount?: number | null;
  related?: PublicEventCard[];
  signedIn?: boolean;
  pageUrl: string;
};

/**
 * Public event page, also used by the preview (same rendering, D2): banner hero, quick
 * facts, sticky section tabs and content on the left, ONE sticky ticket box on the
 * right (a bottom bar on phones). Once over: a summary and the gallery instead of any
 * booking; when cancelled: the reason. Plain-text content only, never injected HTML.
 */
export function EventDetail({
  event,
  preview = false,
  attendeeCount = null,
  related = [],
  signedIn = false,
  pageUrl,
}: EventDetailProps) {
  const sections = sectionsOf(event);
  const ended = event.state === "ended";
  const cancelled = event.state === "cancelled";
  const booking = !ended && !cancelled && event.kind === "standard";

  return (
    <article className="bg-soft-white pb-32 pt-dock-clearance lg:pb-24">
      <Container className="pt-6 md:pt-10">
        <Link
          href={EVENTS_PATH}
          className="mb-6 inline-flex items-center gap-1.5 text-body-sm font-medium text-deep-blue/80 hover:text-deep-blue"
        >
          <FiArrowLeft aria-hidden="true" size={14} />
          {t.back}
        </Link>
        <Hero event={event} />
        <QuickFacts event={event} />

        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="min-w-0">
            <SectionTabs sections={sections} />
            <EventSections event={event} sections={sections} />
            {ended ? (
              <div className="mt-16">
                <Gallery event={event} />
              </div>
            ) : null}
          </div>
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {cancelled ? <CancelledCard cancellation={event.cancellation} /> : null}
            {ended ? (
              <SummaryCard
                startAt={event.startAt}
                endAt={event.endAt}
                attendeeCount={attendeeCount}
              />
            ) : null}
            {booking ? (
              <TicketCard
                slug={event.slug}
                title={event.title}
                state={event.state}
                ticketTypes={event.ticketTypes}
                price={event.price}
                bookable={event.registration.open && !preview}
                blocker={event.registration.blocker}
                signedIn={signedIn}
                pageUrl={pageUrl}
                calendarHref={calendarPath(event.slug)}
              />
            ) : null}
            <EducationNote />
          </aside>
        </div>

        <RelatedEvents events={related} />
      </Container>
    </article>
  );
}
