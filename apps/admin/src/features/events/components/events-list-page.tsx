import Link from "next/link";
import {
  FiArrowRight,
  FiCalendar,
  FiEdit2,
  FiEye,
  FiImage,
  FiMapPin,
  FiPlus,
  FiSettings,
  FiVideo,
} from "react-icons/fi";

import type { StaffProfile } from "@lavieco/shared/identity";
import {
  EVENT_FORMATS,
  EVENT_KINDS,
  EVENT_STATUSES,
  type EventList,
  type EventListItem,
  type EventType,
} from "@lavieco/shared/events";
import { can } from "@lavieco/shared/permissions";
import { Button, SelectField, TextField, cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import type { EventListFilters } from "../types";
import { formatRange, formatVnd } from "../utils/format";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";

type EventsListPageProps = {
  staff: StaffProfile;
  filters: EventListFilters;
  page: EventList;
  types: EventType[];
};

/** Builds `/events?...` keeping the current filters, minus the cursor. */
function listHref(filters: EventListFilters, changes: Partial<EventListFilters>) {
  const params = new URLSearchParams();
  const merged = { ...filters, cursor: undefined, ...changes };
  for (const [key, value] of Object.entries(merged)) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `/events?${query}` : "/events";
}

function StatusTabs({
  filters,
  counts,
}: {
  filters: EventListFilters;
  counts: EventList["counts"];
}) {
  const t = TEXT.vi.list;
  const tabs = ["all", ...EVENT_STATUSES] as const;
  const current = filters.status ?? "all";
  return (
    <nav aria-label={t.tabsLabel} className="-mx-1 mb-6 overflow-x-auto px-1">
      <ul className="flex w-max gap-2 rounded-full border border-hairline bg-white p-1.5">
        {tabs.map((tab) => {
          const active = tab === current;
          return (
            <li key={tab}>
              <Link
                href={listHref(filters, { status: tab === "all" ? undefined : tab })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-[13px] transition-colors",
                  active
                    ? "bg-emerald-brand font-semibold text-deep-blue shadow-emerald-cta-sm"
                    : "text-charcoal/75 hover:bg-mint-mist hover:text-deep-blue",
                )}
              >
                {t.tabs[tab]}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    active ? "bg-soft-white/70" : "bg-mint-mist",
                  )}
                >
                  {counts[tab]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Filters({ filters, types }: { filters: EventListFilters; types: EventType[] }) {
  const t = TEXT.vi;
  const any = { value: "", label: t.list.filters.any };
  return (
    <form
      method="get"
      action="/events"
      aria-label={t.list.filters.label}
      className="mb-6 grid gap-4 rounded-3xl border border-hairline bg-white p-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]"
    >
      {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
      <TextField
        tone="light"
        label={t.list.filters.q}
        name="q"
        defaultValue={filters.q ?? ""}
        placeholder={t.list.filters.qPlaceholder}
      />
      <SelectField
        tone="light"
        label={t.list.filters.type}
        name="typeId"
        defaultValue={filters.typeId ?? ""}
        options={[any, ...types.map((type) => ({ value: type.id, label: type.name.vi }))]}
      />
      <SelectField
        tone="light"
        label={t.list.filters.format}
        name="format"
        defaultValue={filters.format ?? ""}
        options={[
          any,
          ...EVENT_FORMATS.map((format) => ({ value: format, label: t.format[format] })),
        ]}
      />
      <SelectField
        tone="light"
        label={t.list.filters.kind}
        name="kind"
        defaultValue={filters.kind ?? ""}
        options={[any, ...EVENT_KINDS.map((kind) => ({ value: kind, label: t.kind[kind] }))]}
      />
      <div className="flex items-end gap-2">
        <Button type="submit" variant="deep" size="sm" className="h-10.5 px-5">
          {t.list.filters.apply}
        </Button>
        <Link
          href={filters.status ? `/events?status=${filters.status}` : "/events"}
          className="px-2 py-2 text-[12.5px] text-deep-blue/70 underline-offset-4 hover:underline"
        >
          {t.list.filters.reset}
        </Link>
      </div>
    </form>
  );
}

function Seats({ event }: { event: EventListItem }) {
  const t = TEXT.vi;
  if (event.kind === "past")
    return <p className="text-[13px] text-charcoal/60">{t.list.archiveOnly}</p>;
  const { sold, capacity } = event.seats;
  const price = event.pricing.isFree
    ? t.free
    : event.pricing.priceFrom === null
      ? t.list.noTickets
      : t.priceFrom(formatVnd(event.pricing.priceFrom));
  const ratio = capacity ? Math.min(1, sold / capacity) : 0;
  return (
    <div className="min-w-36">
      <p className="text-[13px] font-semibold text-deep-blue">
        {sold} / {capacity ?? t.list.unlimited}
      </p>
      {capacity ? (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mint-mist">
          <div
            className="h-full rounded-full bg-emerald-brand"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      ) : null}
      <p className="mt-1.5 text-[12px] text-charcoal/60">{price}</p>
    </div>
  );
}

function EventRow({ event, typeName }: { event: EventListItem; typeName: string | null }) {
  const t = TEXT.vi;
  const Place = event.format === "online" ? FiVideo : FiMapPin;
  return (
    <li className="grid gap-4 border-b border-hairline px-5 py-5 last:border-b-0 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] lg:items-center lg:gap-6">
      <div className="flex min-w-0 items-center gap-4">
        <div
          aria-hidden="true"
          className="flex h-16 w-14 shrink-0 items-center justify-center rounded-arch-sm bg-mint-mist text-deep-blue/40"
        >
          <FiImage size={18} />
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {typeName ? (
              <span className="rounded-full border border-hairline px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-museum text-deep-blue/70">
                {typeName}
              </span>
            ) : null}
            {event.kind === "past" ? (
              <span className="rounded-full bg-paper px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-museum text-deep-blue/70">
                {t.list.archiveOnly}
              </span>
            ) : null}
          </div>
          <Link
            href={`/events/${event.id}`}
            className="font-display text-lg leading-snug text-deep-blue hover:text-emerald-brand"
          >
            {event.title}
          </Link>
          <p className="truncate text-[12px] text-charcoal/50">/{event.slug}</p>
        </div>
      </div>
      <div className="space-y-1.5 text-[13px] text-charcoal/80">
        <p className="flex items-start gap-2">
          <FiCalendar aria-hidden="true" className="mt-0.5 shrink-0 text-deep-blue/50" size={14} />
          {formatRange(event.startAt, event.endAt)}
        </p>
        <p className="flex items-start gap-2">
          <Place aria-hidden="true" className="mt-0.5 shrink-0 text-deep-blue/50" size={14} />
          {event.format === "online" ? t.list.online : (event.venueName ?? t.list.noVenue)}
        </p>
      </div>
      <Seats event={event} />
      <StatusBadge status={event.status} className="justify-self-start" />
      <div className="flex gap-2">
        <Link
          href={`/events/${event.id}`}
          className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-deep-blue hover:bg-mint-mist"
        >
          <FiEdit2 aria-hidden="true" size={13} />
          {t.list.edit}
        </Link>
        <Link
          href={`/events/${event.id}/preview`}
          className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-deep-blue hover:bg-mint-mist"
        >
          <FiEye aria-hidden="true" size={13} />
          {t.list.preview}
        </Link>
      </div>
    </li>
  );
}

/** `/events`: list with status tabs, filters (plain GET form) and cursor pages. */
export function EventsListPage({ staff, filters, page, types }: EventsListPageProps) {
  const t = TEXT.vi.list;
  const typeNames = new Map(types.map((type) => [type.id, type.name.vi]));
  const canWrite = can(staff, "program:write");
  const total = page.counts[(filters.status as keyof typeof page.counts) ?? "all"] ?? 0;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        intro={t.intro}
        actions={
          <>
            <Button as={Link} href="/events/types" variant="secondary" size="sm">
              <FiSettings aria-hidden="true" size={14} />
              {t.types}
            </Button>
            {canWrite ? (
              <Button as={Link} href="/events/new" size="sm">
                <FiPlus aria-hidden="true" size={15} />
                {t.create}
              </Button>
            ) : null}
          </>
        }
      />
      <StatusTabs filters={filters} counts={page.counts} />
      <Filters filters={filters} types={types} />

      <section className="overflow-hidden rounded-3xl border border-hairline bg-white shadow-ambient">
        <div className="hidden border-b border-hairline bg-soft-white px-5 py-3 text-[10.5px] font-semibold uppercase tracking-museum text-deep-blue/60 lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] lg:gap-6">
          <span>{t.columns.event}</span>
          <span>{t.columns.time}</span>
          <span>{t.columns.seats}</span>
          <span>{t.columns.status}</span>
          <span className="w-44">{t.columns.actions}</span>
        </div>
        {page.items.length === 0 ? (
          <p className="px-5 py-16 text-center text-[14px] text-charcoal/60">{t.empty}</p>
        ) : (
          <ul>
            {page.items.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                typeName={typeNames.get(event.typeId) ?? null}
              />
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-charcoal/65">
        <span>{t.summary(page.items.length, total)}</span>
        <div className="flex gap-2">
          {filters.cursor ? (
            <Link
              href={listHref(filters, {})}
              className="rounded-full border border-hairline px-4 py-2 hover:bg-mint-mist"
            >
              {t.first}
            </Link>
          ) : null}
          {page.nextCursor ? (
            <Link
              href={listHref(filters, { cursor: page.nextCursor })}
              className="flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-deep-blue hover:bg-mint-mist"
            >
              {t.next}
              <FiArrowRight aria-hidden="true" size={13} />
            </Link>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
