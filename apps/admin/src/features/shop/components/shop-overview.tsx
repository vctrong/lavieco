import Link from "next/link";
import {
  FiArrowRight,
  FiBox,
  FiMessageSquare,
  FiSettings,
  FiShoppingBag,
  FiTag,
  FiUsers,
} from "react-icons/fi";

import type { ShopOverview as Stats } from "@lavieco/shared/shop";

import { TEXT } from "../constants/text";
import { ShopShell } from "./shop-shell";

const t = TEXT.vi;

const CARDS = [
  { id: "orders", href: "/shop/orders", icon: FiShoppingBag },
  { id: "reviews", href: "/shop/reviews", icon: FiMessageSquare },
  { id: "products", href: "/shop/products", icon: FiBox },
  { id: "categories", href: "/shop/categories", icon: FiTag },
  { id: "brands", href: "/shop/brands", icon: FiUsers },
  { id: "settings", href: "/shop/settings", icon: FiSettings },
] as const;

/** `/shop`: entry to the shop pages. Sales figures arrive with orders (docs/08 S6). */
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

function StatsPanel({ stats }: { stats: Stats }) {
  const s = t.overviewStats;
  const todo = [
    { label: s.confirm, value: stats.todo.awaitingConfirmation },
    { label: s.pack, value: stats.todo.toPack },
    { label: s.ship, value: stats.todo.toShip },
    { label: s.attention, value: stats.todo.attention },
  ];
  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <section className="rounded-3xl border border-hairline bg-white p-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-museum text-deep-blue/60">
          {s.revenue}
        </h2>
        <dl className="mt-3 grid grid-cols-3 gap-3">
          {(["today", "week", "month"] as const).map((key) => (
            <div key={key}>
              <dt className="text-[12.5px] text-charcoal/65">{s[key]}</dt>
              <dd className="font-display text-xl text-deep-blue">
                {money.format(stats.revenue[key])}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="rounded-3xl border border-hairline bg-white p-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-museum text-deep-blue/60">
          {s.todo}
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {todo.map((item) => (
            <div key={item.label}>
              <dt className="text-[12.5px] text-charcoal/65">{item.label}</dt>
              <dd className="font-display text-2xl text-deep-blue">{item.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[13px] text-charcoal/75">
          {s.lowStock}:{" "}
          <Link href="/shop/products?stock=low" className="font-semibold text-emerald-ink">
            {stats.lowStock}
          </Link>
        </p>
      </section>
    </div>
  );
}

export function ShopOverview({ stats }: { stats: Stats | null }) {
  return (
    <ShopShell section="overview" title={t.title} intro={t.overview.intro}>
      {stats ? <StatsPanel stats={stats} /> : null}
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
