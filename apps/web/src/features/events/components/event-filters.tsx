"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useTransition, type MouseEvent } from "react";
import { FiSliders, FiX } from "react-icons/fi";

import type { PublicEventType } from "@lavieco/shared/events";
import { cn } from "@lavieco/ui";

import { EVENTS_PATH } from "../constants/config";
import { TEXT } from "../constants/text";
import { monthLabel } from "../utils/format";

/** The filters as they are in the URL (shareable, back/forward restore them). */
export type ListFilters = {
  typeId?: string;
  format?: string;
  free?: string;
  month?: string;
};

function hrefWith(filters: ListFilters, changes: Partial<ListFilters>) {
  const params = new URLSearchParams();
  // A new filter always starts from the first page (the cursor is dropped).
  for (const [key, value] of Object.entries({ ...filters, ...changes })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  // Back to the calendar: the page above it changes height (no featured banner when filtered).
  return query ? `${EVENTS_PATH}?${query}#lich` : `${EVENTS_PATH}#lich`;
}

type ControlsProps = {
  filters: ListFilters;
  types: PublicEventType[];
  months: string[];
  layout: "bar" | "sheet";
  onChange: (changes: Partial<ListFilters>) => void;
};

const selectClass =
  "rounded-full border border-hairline bg-white py-2 pl-4 pr-8 text-body-sm text-charcoal focus:border-emerald-brand focus:outline-none";

/**
 * The controls themselves. Inside a GET form, so without JavaScript the type buttons
 * submit and a "Lọc" button appears; with JavaScript every change applies at once.
 */
function FilterControls({ filters, types, months, layout, onChange }: ControlsProps) {
  const t = TEXT.vi.filters;
  const id = useId();
  const pick = (event: MouseEvent<HTMLButtonElement>, typeId: string) => {
    event.preventDefault();
    onChange({ typeId: typeId || undefined });
  };
  const timeLabel = (month: string, index: number) =>
    index === 0 ? t.thisMonth : index === 1 ? t.nextMonth : monthLabel(month);
  const sheet = layout === "sheet";

  return (
    <form
      method="get"
      action={EVENTS_PATH}
      className={cn("flex gap-3", sheet ? "flex-col" : "flex-wrap items-center")}
    >
      <div
        role="group"
        aria-label={TEXT.vi.filters.label}
        className={cn(
          "flex gap-1 rounded-full bg-mint-mist p-1",
          sheet ? "flex-wrap" : "overflow-x-auto",
        )}
      >
        {[
          { id: "", name: t.all },
          ...types.map((type) => ({ id: type.id, name: type.name.vi })),
        ].map((option) => {
          const active = (filters.typeId ?? "") === option.id;
          return (
            <button
              key={option.id || "all"}
              type="submit"
              name="typeId"
              value={option.id}
              aria-pressed={active}
              onClick={(event) => pick(event, option.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-body-sm transition-colors motion-reduce:transition-none",
                active
                  ? "bg-emerald-brand font-semibold text-charcoal"
                  : "text-charcoal/80 hover:bg-white",
              )}
            >
              {active ? (
                <span aria-hidden="true" className="size-1.5 rounded-full bg-canary" />
              ) : null}
              {option.name}
            </button>
          );
        })}
      </div>

      <label htmlFor={`${id}-format`} className="sr-only">
        {t.format}
      </label>
      <select
        id={`${id}-format`}
        name="format"
        value={filters.format ?? ""}
        onChange={(event) => onChange({ format: event.target.value || undefined })}
        className={selectClass}
      >
        <option value="">{t.anyFormat}</option>
        <option value="offline">{t.offline}</option>
        <option value="online">{t.online}</option>
      </select>

      <label htmlFor={`${id}-month`} className="sr-only">
        {t.time}
      </label>
      <select
        id={`${id}-month`}
        name="month"
        value={filters.month ?? ""}
        onChange={(event) => onChange({ month: event.target.value || undefined })}
        className={selectClass}
      >
        <option value="">{t.anyTime}</option>
        {months.map((month, index) => (
          <option key={month} value={month}>
            {timeLabel(month, index)}
          </option>
        ))}
      </select>

      <label className="flex cursor-pointer items-center gap-2 text-body-sm text-charcoal">
        <input
          type="checkbox"
          name="free"
          value="true"
          checked={filters.free === "true"}
          onChange={(event) => onChange({ free: event.target.checked ? "true" : undefined })}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="relative h-5 w-9 rounded-full bg-deep-blue/20 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-emerald-brand peer-checked:after:translate-x-4 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-brand motion-reduce:transition-none motion-reduce:after:transition-none"
        />
        {t.free}
      </label>

      <noscript>
        <button
          type="submit"
          className="rounded-full bg-deep-blue px-4 py-2 text-body-sm font-semibold text-soft-white"
        >
          {t.apply}
        </button>
      </noscript>
    </form>
  );
}

/**
 * One row that sticks under the navigation while scrolling: type (segmented), format,
 * time, free only, and the number of results. Every change updates the URL at once
 * (`router.push`, so back/forward walk through the filters); on phones the controls
 * live in a "Bộ lọc" dialog.
 */
export function EventFilters({
  filters,
  types,
  months,
  total,
}: {
  filters: ListFilters;
  types: PublicEventType[];
  months: string[];
  total: number | null;
}) {
  const t = TEXT.vi.filters;
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const active = Object.values(filters).filter(Boolean).length;

  const change = (changes: Partial<ListFilters>) =>
    startTransition(() => router.push(hrefWith(filters, changes)));

  const count =
    total === null ? null : (
      <p
        aria-live="polite"
        className={cn(
          "flex shrink-0 items-center gap-2 text-label-caps uppercase text-emerald-ink",
          pending && "opacity-60",
        )}
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-brand" />
        {t.count(total)}
      </p>
    );

  return (
    <div className="sticky top-24 z-30 mb-10">
      <div className="hidden items-center justify-between gap-4 rounded-full border border-hairline bg-white/95 px-3 py-2 shadow-ambient backdrop-blur md:flex">
        <FilterControls
          filters={filters}
          types={types}
          months={months}
          layout="bar"
          onChange={change}
        />
        {count}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-full border border-hairline bg-white/95 px-3 py-2 shadow-ambient backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => dialog.current?.showModal()}
          className="flex items-center gap-2 rounded-full bg-mint-mist px-4 py-2 text-body-sm font-semibold text-deep-blue"
        >
          <FiSliders aria-hidden="true" size={14} />
          {t.open}
          {active > 0 ? (
            <span className="rounded-full bg-emerald-brand px-1.5 text-meta text-charcoal">
              {active}
            </span>
          ) : null}
        </button>
        {count}
      </div>

      <dialog
        ref={dialog}
        aria-label={t.label}
        className="m-0 mt-auto w-full max-w-none rounded-t-[2rem] bg-soft-white p-6 backdrop:modal-scrim md:hidden"
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="font-display text-headline-sm text-deep-blue">{t.label}</p>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label={t.close}
            className="flex size-10 items-center justify-center rounded-full text-deep-blue hover:bg-mint-mist"
          >
            <FiX aria-hidden="true" size={18} />
          </button>
        </div>
        <FilterControls
          filters={filters}
          types={types}
          months={months}
          layout="sheet"
          onChange={change}
        />
        <div className="mt-6 flex items-center justify-between gap-3">
          {active > 0 ? (
            <button
              type="button"
              onClick={() =>
                change({ typeId: undefined, format: undefined, month: undefined, free: undefined })
              }
              className="text-body-sm text-deep-blue underline underline-offset-4"
            >
              {t.reset}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rounded-full bg-deep-blue px-6 py-3 text-sm font-semibold text-soft-white"
          >
            {total === null ? t.apply : `${t.apply} (${total})`}
          </button>
        </div>
      </dialog>
    </div>
  );
}
