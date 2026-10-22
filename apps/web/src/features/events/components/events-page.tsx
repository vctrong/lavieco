import Link from "next/link";
import { FiAlertCircle, FiArrowRight } from "react-icons/fi";

import type { PublicEventCard } from "@lavieco/shared/events";
import { Button, Container, PearlDot } from "@lavieco/ui";

import {
  EVENTS_PATH,
  FEATURED_STATES,
  MONTH_OPTIONS,
  PAST_PAGE_SIZE,
  UPCOMING_PAGE_SIZE,
} from "../constants/config";
import { TEXT } from "../constants/text";
import { listEvents, listEventTypes, type EventFilters as Filters } from "../server/events";
import { groupByMonth, monthParts, upcomingMonths } from "../utils/format";
import { EventCard } from "./event-card";
import { EventFilters, type ListFilters } from "./event-filters";
import { FeaturedBanner } from "./featured-banner";
import { LadderStrip } from "./ladder-strip";
import { PastStrip } from "./past-strip";

function Hero() {
  const t = TEXT.vi.hero;
  return (
    <header className="mx-auto max-w-2xl text-center">
      <p className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-3 py-1 text-label-caps uppercase text-emerald-ink">
        <PearlDot size="sm" tone="emerald" />
        {t.eyebrow}
      </p>
      <h1 className="mt-5 font-display text-display-hero-mobile text-deep-blue md:text-display-hero">
        {t.title} <em className="text-emerald-ink">{t.titleAccent}</em>
      </h1>
      <p className="mt-5 text-body-lg text-charcoal/75">{t.intro}</p>
    </header>
  );
}

function MonthGroups({ events }: { events: PublicEventCard[] }) {
  const t = TEXT.vi.list;
  return (
    <div className="space-y-14">
      {groupByMonth(events).map((group) => {
        const { month, year } = monthParts(group.month);
        const headingId = `thang-${group.month}`;
        return (
          <section key={group.month} aria-labelledby={headingId}>
            <div className="mb-6 flex items-center gap-3 border-b border-hairline pb-3">
              <h2
                id={headingId}
                className="font-display text-headline-sm text-deep-blue md:text-headline-md"
              >
                {t.month(month, year)}
              </h2>
              <span className="rounded-full bg-mint-mist px-2.5 py-0.5 text-meta text-charcoal/75">
                {t.monthCount(group.events.length)}
              </span>
            </div>
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {group.events.map((event) => (
                <li key={event.slug}>
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Notice({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-pedestal border border-dashed border-hairline px-6 py-14 text-center">
      <p className="font-display text-title-editorial text-deep-blue">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-body-md text-charcoal/70">{hint}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

/**
 * `/chuong-trinh`: compact hero, the featured banner, one sticky filter row, the
 * calendar grouped by month (Vietnam time), "Đã diễn ra" and the four value steps.
 * Badges and prices come computed from program-service; nothing is guessed here.
 */
export async function EventsPage({ filters }: { filters: Filters }) {
  const t = TEXT.vi.list;
  const listFilters: ListFilters = {
    typeId: filters.typeId,
    format: filters.format,
    free: filters.free,
    month: filters.month,
  };
  const filtered = Object.values(listFilters).some(Boolean);
  const [upcoming, past, types] = await Promise.all([
    listEvents("upcoming", filters, UPCOMING_PAGE_SIZE),
    listEvents("past", {}, PAST_PAGE_SIZE),
    listEventTypes(),
  ]);
  const items = upcoming.status === "ok" ? upcoming.page.items : [];
  const featured =
    !filtered && !filters.cursor
      ? items.find((event) => (FEATURED_STATES as readonly string[]).includes(event.state))
      : undefined;
  const calendar = featured ? items.filter((event) => event !== featured) : items;
  const nextCursor = upcoming.status === "ok" ? upcoming.page.nextCursor : null;

  return (
    <div className="bg-soft-white pb-24 pt-dock-clearance">
      <Container className="pt-10 md:pt-14">
        <Hero />
        {featured ? (
          <div className="mt-12">
            <FeaturedBanner event={featured} />
          </div>
        ) : null}

        <section id="lich" aria-label={t.title} className="mt-14 scroll-mt-28">
          <EventFilters
            filters={listFilters}
            types={types}
            months={upcomingMonths(MONTH_OPTIONS)}
            total={upcoming.status === "ok" ? upcoming.page.total : null}
          />
          {upcoming.status === "error" ? (
            <div role="alert">
              <Notice
                title={t.error}
                hint={t.errorHint}
                action={
                  <Button as={Link} href={EVENTS_PATH} variant="secondary">
                    <FiAlertCircle aria-hidden="true" size={15} />
                    {t.retry}
                  </Button>
                }
              />
            </div>
          ) : calendar.length > 0 ? (
            <MonthGroups events={calendar} />
          ) : featured ? null : (
            <Notice title={t.empty} hint={t.emptyHint} />
          )}
          {nextCursor ? (
            <div className="mt-12 flex justify-center">
              <Button
                as={Link}
                variant="secondary"
                href={`${EVENTS_PATH}?${new URLSearchParams({
                  ...Object.fromEntries(
                    Object.entries(listFilters).filter((entry): entry is [string, string] =>
                      Boolean(entry[1]),
                    ),
                  ),
                  cursor: nextCursor,
                }).toString()}#lich`}
              >
                {t.more}
                <FiArrowRight aria-hidden="true" size={15} />
              </Button>
            </div>
          ) : null}
        </section>

        <PastStrip events={past.status === "ok" ? past.page.items : []} />
        <LadderStrip />
      </Container>
    </div>
  );
}
