import Link from "next/link";
import type { ReactNode } from "react";

import { TEXT } from "../constants/text";

const t = TEXT.vi;

export type ShopSection = "overview" | "orders" | "products" | "categories" | "brands" | "settings";

const LINKS: { id: Exclude<ShopSection, "overview">; href: string }[] = [
  { id: "orders", href: "/shop/orders" },
  { id: "products", href: "/shop/products" },
  { id: "categories", href: "/shop/categories" },
  { id: "brands", href: "/shop/brands" },
  { id: "settings", href: "/shop/settings" },
];

/** Page header and the shop's sub-navigation (scrolls sideways on a phone). */
export function ShopShell({
  section,
  title,
  intro,
  actions,
  children,
}: {
  section: ShopSection;
  title: string;
  intro?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-museum text-deep-blue/60">
            {t.eyebrow}
          </p>
          <h1 className="font-display text-3xl text-deep-blue md:text-4xl">{title}</h1>
          {intro ? <p className="mt-2 max-w-2xl text-[14.5px] text-charcoal/75">{intro}</p> : null}
        </div>
        {actions}
      </header>
      <nav aria-label={t.title} className="-mx-4 mb-6 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex min-w-max gap-2">
          {LINKS.map((link) => {
            const current = link.id === section;
            return (
              <li key={link.id}>
                <Link
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  className={
                    current
                      ? "flex min-h-11 items-center rounded-full bg-deep-blue px-4 text-[13px] font-semibold text-soft-white"
                      : "flex min-h-11 items-center rounded-full border border-hairline bg-white px-4 text-[13px] text-deep-blue hover:bg-mint-mist"
                  }
                >
                  {t.nav[link.id]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </div>
  );
}
