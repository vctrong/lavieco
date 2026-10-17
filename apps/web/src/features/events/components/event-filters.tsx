import Link from "next/link";

import type { PublicEventType } from "@lavieco/shared/events";
import { cn } from "@lavieco/ui";

import { EVENTS_PATH } from "../constants/config";
import { TEXT } from "../constants/text";
import type { EventFilters } from "../server/events";
import { monthLabel, upcomingMonths } from "../utils/format";

function hrefWith(filters: EventFilters, changes: Partial<EventFilters>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, cursor: undefined, ...changes })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${EVENTS_PATH}?${query}#lich` : `${EVENTS_PATH}#lich`;
}

function Chip({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      scroll={false}
      className={cn(
        "rounded-full px-4 py-2 text-[13px] transition-colors motion-reduce:transition-none",
        active
          ? "bg-emerald-brand font-semibold text-deep-blue shadow-emerald-cta-sm"
          : "border border-hairline bg-white text-charcoal/75 hover:bg-mint-mist hover:text-deep-blue",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Filters as plain links and a GET form: they work without JavaScript and keep
 * the URL shareable (type, online/offline, free, month).
 */
export function EventFilters({
  filters,
  types,
}: {
  filters: EventFilters;
  types: PublicEventType[];
}) {
  const t = TEXT.vi.filters;
  const months = upcomingMonths(6);
  return (
    <nav
      aria-label={t.label}
      className="mb-8 flex flex-col gap-4 rounded-3xl bg-mint-mist/60 p-4 md:p-5"
    >
      <div className="flex flex-wrap gap-2">
        <Chip href={hrefWith(filters, { typeId: undefined })} active={!filters.typeId}>
          {t.all}
        </Chip>
        {types.map((type) => (
          <Chip
            key={type.id}
            href={hrefWith(filters, { typeId: type.id })}
            active={filters.typeId === type.id}
          >
            {type.name.vi}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          href={hrefWith(filters, { format: filters.format === "offline" ? undefined : "offline" })}
          active={filters.format === "offline"}
        >
          {t.offline}
        </Chip>
        <Chip
          href={hrefWith(filters, { format: filters.format === "online" ? undefined : "online" })}
          active={filters.format === "online"}
        >
          {t.online}
        </Chip>
        <Chip
          href={hrefWith(filters, { free: filters.free === "true" ? undefined : "true" })}
          active={filters.free === "true"}
        >
          {t.free}
        </Chip>
        <form
          method="get"
          action={`${EVENTS_PATH}#lich`}
          className="ml-auto flex items-center gap-2"
        >
          {filters.typeId ? <input type="hidden" name="typeId" value={filters.typeId} /> : null}
          {filters.format ? <input type="hidden" name="format" value={filters.format} /> : null}
          {filters.free ? <input type="hidden" name="free" value={filters.free} /> : null}
          <label htmlFor="loc-thang" className="sr-only">
            {t.month}
          </label>
          <select
            id="loc-thang"
            name="month"
            defaultValue={filters.month ?? ""}
            className="rounded-full border border-hairline bg-white px-4 py-2 text-[13px] text-charcoal focus:border-emerald-brand focus:outline-none"
          >
            <option value="">{t.anyMonth}</option>
            {months.map((month) => (
              <option key={month} value={month}>
                {monthLabel(month)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-full bg-deep-blue px-4 py-2 text-[13px] font-semibold text-soft-white hover:bg-deep-blue/90"
          >
            {t.apply}
          </button>
        </form>
        {Object.values(filters).some(Boolean) ? (
          <Link
            href={`${EVENTS_PATH}#lich`}
            scroll={false}
            className="text-[12.5px] text-deep-blue/70 underline-offset-4 hover:underline"
          >
            {t.reset}
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
