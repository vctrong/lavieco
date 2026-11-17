import Link from "next/link";
import { FiArrowRight, FiBox, FiSettings, FiTag, FiUsers } from "react-icons/fi";

import { TEXT } from "../constants/text";
import { ShopShell } from "./shop-shell";

const t = TEXT.vi;

const CARDS = [
  { id: "products", href: "/shop/products", icon: FiBox },
  { id: "categories", href: "/shop/categories", icon: FiTag },
  { id: "brands", href: "/shop/brands", icon: FiUsers },
  { id: "settings", href: "/shop/settings", icon: FiSettings },
] as const;

/** `/shop`: entry to the shop pages. Sales figures arrive with orders (docs/08 S6). */
export function ShopOverview() {
  return (
    <ShopShell section="overview" title={t.title} intro={t.overview.intro}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {CARDS.map(({ id, href, icon: Icon }) => (
          <li key={id}>
            <Link
              href={href}
              className="flex h-full items-start gap-4 rounded-3xl border border-hairline bg-white p-5 hover:border-emerald-brand hover:bg-mint-mist/40"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-mint-mist text-deep-blue">
                <Icon aria-hidden="true" size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg text-deep-blue">{t.nav[id]}</span>
                <span className="mt-1 block text-[13.5px] leading-relaxed text-charcoal/75">
                  {t.overview.cards[id]}
                </span>
              </span>
              <FiArrowRight aria-hidden="true" size={16} className="mt-1 text-deep-blue/50" />
            </Link>
          </li>
        ))}
      </ul>
    </ShopShell>
  );
}
