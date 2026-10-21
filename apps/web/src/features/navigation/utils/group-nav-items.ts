import type { PrimaryNavItem } from "../types";

export type NavGroups = {
  /** Inline links (priority 1 always, priority 2 only from 1280px). */
  inline: readonly PrimaryNavItem[];
  /** "Khám phá" dropdown, from 1280px. */
  explore: readonly PrimaryNavItem[];
  /** "Thêm" dropdown, 1024–1279px: everything that is not always inline. */
  more: readonly PrimaryNavItem[];
};

/** Splits the primary links by `priority`, keeping their declared order. */
export function groupNavItems(items: readonly PrimaryNavItem[]): NavGroups {
  return {
    inline: items.filter((item) => item.priority <= 2),
    explore: items.filter((item) => item.priority === 3),
    more: items.filter((item) => item.priority >= 2),
  };
}
