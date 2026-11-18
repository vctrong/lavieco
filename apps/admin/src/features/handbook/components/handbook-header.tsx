import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";

const t = TEXT.vi;

const TABS = [
  { id: "manage", href: "/handbook" },
  { id: "history", href: "/handbook/history" },
] as const;

/** Title, version badges, actions and the two handbook tabs. */
export function HandbookHeader({
  current,
  draftNumber,
  publishedNumber,
  actions,
}: {
  current: "manage" | "history";
  draftNumber: number | null;
  publishedNumber: number | null;
  actions?: ReactNode;
}) {
  return (
    <header className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-museum text-deep-blue/60">
            {t.eyebrow}
          </p>
          <h1 className="font-display text-3xl text-deep-blue md:text-4xl">{t.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {draftNumber ? (
              <span className="rounded-full bg-canary px-3 py-1 text-[12px] font-semibold text-charcoal">
                {t.status.draft(draftNumber)}
              </span>
            ) : null}
            <span className="rounded-full bg-mint-mist px-3 py-1 text-[12px] font-semibold text-emerald-ink">
              {publishedNumber ? t.status.published(publishedNumber) : t.status.none}
            </span>
          </div>
          {current === "manage" ? (
            <p className="mt-3 max-w-2xl text-[14px] text-charcoal/75">{t.intro}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <nav aria-label={t.title} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex min-w-max gap-2">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <Link
                href={tab.href}
                aria-current={tab.id === current ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-full px-4 text-[13px]",
                  tab.id === current
                    ? "bg-deep-blue font-semibold text-soft-white"
                    : "border border-hairline bg-white text-deep-blue hover:bg-mint-mist",
                )}
              >
                {t.nav[tab.id]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
