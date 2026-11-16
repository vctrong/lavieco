"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { FiCalendar, FiCamera, FiGrid, FiShoppingBag, FiTag } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import type { MobileTab } from "../constants/nav";
import { TEXT } from "../constants/text";

type Icon = ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" }>;

const ICONS: Record<MobileTab["id"], Icon> = {
  events: FiCalendar,
  orders: FiTag,
  checkin: FiCamera,
  shop: FiShoppingBag,
  more: FiGrid,
};

/** "Thêm" stays lit on the screens it leads to, so the bar never shows nothing active. */
function isActive(tab: MobileTab, pathname: string, tabs: readonly MobileTab[]): boolean {
  if (tab.id !== "more") return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
  return !tabs.some(
    (other) =>
      other.id !== "more" && (pathname === other.href || pathname.startsWith(`${other.href}/`)),
  );
}

/**
 * Bottom tab bar on phones (< 768 px): 44 px+ targets, above the iOS home bar.
 * `tabs` are already filtered by permission (UX only, services enforce it).
 */
export function TabBar({ tabs }: { tabs: readonly MobileTab[] }) {
  const t = TEXT.vi;
  const pathname = usePathname();
  return (
    <nav
      aria-label={t.tabsLabel}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-soft-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch px-[max(0.25rem,env(safe-area-inset-left))]">
        {tabs.map((tab) => {
          const Icon = ICONS[tab.id];
          const active = isActive(tab, pathname, tabs);
          return (
            <li key={tab.id} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11.5px] font-medium transition-colors",
                  active ? "text-deep-blue" : "text-charcoal/60 hover:text-deep-blue",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-emerald-brand/25",
                  )}
                >
                  <Icon aria-hidden="true" size={19} />
                </span>
                {t.tabs[tab.id]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
