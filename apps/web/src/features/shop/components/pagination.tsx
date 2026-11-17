import Link from "next/link";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";

const t = TEXT.vi.pagination;

type Slot = { kind: "page"; page: number } | { kind: "gap"; key: string };

/** 1 … 4 5 6 … 12: always the ends and the neighbours of the current page. */
export function pageSlots(page: number, pages: number): Slot[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...wanted].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const slots: Slot[] = [];
  list.forEach((n, index) => {
    const previous = list[index - 1];
    if (previous !== undefined && n - previous === 2) slots.push({ kind: "page", page: n - 1 });
    else if (previous !== undefined && n - previous > 2)
      slots.push({ kind: "gap", key: `gap-${n}` });
    slots.push({ kind: "page", page: n });
  });
  return slots;
}

function Arrow({ href, direction }: { href: string | null; direction: "prev" | "next" }) {
  const label = direction === "prev" ? t.prev : t.next;
  const icon =
    direction === "prev" ? (
      <FiArrowLeft aria-hidden="true" size={16} />
    ) : (
      <FiArrowRight aria-hidden="true" size={16} />
    );
  const base =
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border px-3 text-[14px] font-semibold sm:px-4";
  if (!href) {
    return (
      <span
        aria-disabled="true"
        className={cn(base, "border-hairline text-deep-blue/30")}
        title={label}
      >
        {direction === "prev" ? icon : null}
        <span className="sr-only sm:not-sr-only">{label}</span>
        {direction === "next" ? icon : null}
      </span>
    );
  }
  return (
    <Link
      href={href}
      rel={direction}
      className={cn(
        base,
        "border-hairline bg-white text-deep-blue transition-colors hover:border-emerald-brand hover:bg-mint-mist motion-reduce:transition-none",
      )}
    >
      {direction === "prev" ? icon : null}
      <span className="sr-only sm:not-sr-only">{label}</span>
      {direction === "next" ? icon : null}
    </Link>
  );
}

/**
 * Numbered pages drawn as beads on a perforated thread (the same dashed line as the
 * product ticket). Plain links: works without JavaScript and every page has a URL.
 * On a phone the beads give way to "Trang 2 / 5" between the arrows.
 */
export function Pagination({
  page,
  pages,
  total,
  pageSize,
  hrefOf,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  hrefOf: (page: number) => string;
}) {
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label={t.label} className="mt-14 flex flex-col items-center gap-4">
      <div className="flex w-full max-w-xl items-center justify-between gap-3">
        <Arrow direction="prev" href={page > 1 ? hrefOf(page - 1) : null} />

        <p className="text-[14px] font-semibold text-deep-blue sm:hidden">{t.short(page, pages)}</p>

        <ol className="relative hidden items-center gap-4 sm:flex">
          {/* The thread the beads hang on. */}
          <span
            aria-hidden="true"
            className="absolute -inset-x-3 top-1/2 border-t-2 border-dashed border-deep-blue/20"
          />
          {pageSlots(page, pages).map((slot) =>
            slot.kind === "gap" ? (
              <li
                key={slot.key}
                aria-hidden="true"
                className="relative grid size-6 place-items-center rounded-full bg-soft-white text-[13px] text-deep-blue/50"
              >
                …
              </li>
            ) : (
              <li key={slot.page} className="relative">
                <Link
                  href={hrefOf(slot.page)}
                  aria-label={t.page(slot.page)}
                  aria-current={slot.page === page ? "page" : undefined}
                  className={cn(
                    "grid size-11 place-items-center rounded-full text-[14px] font-semibold tabular-nums transition-[transform,background-color,border-color] motion-reduce:transition-none",
                    slot.page === page
                      ? "bg-emerald-brand text-charcoal ring-4 ring-mint-mist motion-safe:scale-110"
                      : "border border-hairline bg-white text-deep-blue hover:border-emerald-brand hover:bg-mint-mist motion-safe:hover:-translate-y-0.5",
                  )}
                >
                  {slot.page}
                </Link>
              </li>
            ),
          )}
        </ol>

        <Arrow direction="next" href={page < pages ? hrefOf(page + 1) : null} />
      </div>
      <p className="text-[13px] text-charcoal/65">{t.range(from, to, total)}</p>
    </nav>
  );
}
