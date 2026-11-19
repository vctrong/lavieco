import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";

const t = TEXT.vi;

export type SalesSection = "orders" | "prices" | "summary";

const LINKS: { id: SalesSection; href: string }[] = [
  { id: "orders", href: "/sales" },
  { id: "prices", href: "/sales/prices" },
  { id: "summary", href: "/sales/summary" },
];

/** Header and sub-navigation of the order book; wide pages cap at 7xl for big screens. */
export function SalesShell({
  section,
  title,
  intro,
  actions,
  wide = false,
  children,
}: {
  section: SalesSection;
  title: string;
  intro?: string;
  actions?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto", wide ? "max-w-7xl" : "max-w-5xl")}>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-museum text-deep-blue/60">
            {t.eyebrow}
          </p>
          <h1 className="font-display text-3xl text-deep-blue md:text-4xl">{title}</h1>
          {intro ? <p className="mt-2 max-w-2xl text-[15px] text-charcoal/75">{intro}</p> : null}
        </div>
        {actions}
      </header>
      <nav aria-label={t.title} className="-mx-4 mb-5 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex min-w-max gap-2">
          {LINKS.map((link) => (
            <li key={link.id}>
              <Link
                href={link.href}
                aria-current={link.id === section ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-full px-4 text-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-blue",
                  link.id === section
                    ? "bg-deep-blue font-semibold text-soft-white"
                    : "border border-hairline bg-white text-deep-blue hover:bg-mint-mist",
                )}
              >
                {t.nav[link.id]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
