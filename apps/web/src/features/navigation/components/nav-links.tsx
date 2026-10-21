"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiBookOpen, FiGlobe } from "react-icons/fi";

import { PearlDot, cn } from "@lavieco/ui";

import { NAV_ITEMS } from "../constants/config";
import { TEXT } from "../constants/text";
import type { PrimaryNavItem } from "../types";
import { groupNavItems } from "../utils/group-nav-items";
import { isNavItemActive } from "../utils/is-nav-item-active";
import { NavDropdown, type NavDropdownItem } from "./nav-dropdown";
import { NAV_LINK_CLASS } from "./styles";

const t = TEXT.vi;
const GROUPS = groupNavItems(NAV_ITEMS);
const FULL_TITLES: Partial<Record<PrimaryNavItem["id"], string>> = t.navbar.exploreTitles;
const EXPLORE_ICONS: Partial<Record<PrimaryNavItem["id"], typeof FiBookOpen>> = {
  handbook: FiBookOpen,
  impact: FiGlobe,
};

/** The panels have room for the full title ("Cẩm nang xanh số"); the bar keeps the short label. */
export const fullTitleOf = (item: PrimaryNavItem) => FULL_TITLES[item.id] ?? t.items[item.id].label;

const exploreItem = (item: PrimaryNavItem): NavDropdownItem => ({
  id: item.id,
  href: item.href,
  title: fullTitleOf(item),
  description: t.items[item.id].hint,
  icon: EXPLORE_ICONS[item.id],
});

const moreItem = (item: PrimaryNavItem): NavDropdownItem => ({
  id: item.id,
  href: item.href,
  title: fullTitleOf(item),
});

const EXPLORE_ITEMS = GROUPS.explore.map(exploreItem);
const MORE_ITEMS = GROUPS.more.map(moreItem);

/**
 * Center links from 1024px. Breakpoints are CSS only: priority-2 links and "Khám phá"
 * appear from 1280px (xl); below that "Thêm" holds everything but priority 1.
 */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label={t.primaryNavLabel} className="hidden lg:block">
      <ul className="flex items-center gap-6 xl:gap-8">
        {GROUPS.inline.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          return (
            <li key={item.id} className={cn(item.priority > 1 && "hidden xl:block")}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(NAV_LINK_CLASS, active && "font-semibold text-deep-blue")}
              >
                {t.items[item.id].label}
                {active ? (
                  <PearlDot
                    size="sm"
                    tone="canary"
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
        <li className="hidden xl:block">
          <NavDropdown
            label={t.navbar.explore}
            variant="rich"
            heading={t.navbar.exploreHeading}
            items={EXPLORE_ITEMS}
          />
        </li>
        <li className="xl:hidden">
          <NavDropdown label={t.navbar.more} variant="compact" items={MORE_ITEMS} />
        </li>
      </ul>
    </nav>
  );
}
