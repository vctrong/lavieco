import type { CatalogueItem, NavItem } from "../types";

/** Set to true once EN content and the URL strategy (PQ3) exist. */
export const LANGUAGE_SWITCH_ENABLED = false;

/** Dock shrinks after this many pixels of scroll (design.md §7.5.3). */
export const DOCK_SHRINK_SCROLL_Y = 120;

/** Center links of the dock. Copy lives in text.ts under the same `id`. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "story", href: "/cau-chuyen" },
  { id: "programs", href: "/chuong-trinh" },
  { id: "collection", href: "/bo-suu-tap" },
  { id: "handbook", href: "/cam-nang" },
  { id: "impact", href: "/tac-dong" },
];

export const CTA_HREF = "/hop-tac";

export const CATALOGUE_ITEMS: readonly CatalogueItem[] = [
  { id: "preface", number: "Nº 00", href: "/" },
  { id: "story", number: "Nº 01", href: "/cau-chuyen" },
  { id: "programs", number: "Nº 02", href: "/chuong-trinh" },
  { id: "collection", number: "Nº 03", href: "/bo-suu-tap" },
  { id: "handbook", number: "Nº 04", href: "/cam-nang" },
  { id: "impact", number: "Nº 05", href: "/tac-dong" },
  { id: "team", number: "Nº 06", href: "/#nguoi-ke-chuyen" },
  { id: "contact", number: "Nº 07", href: "/hop-tac" },
];

// TODO(real-data): official social profile URLs; the prototype only linked the site roots.
export const SOCIAL_LINKS = {
  facebook: "https://facebook.com",
  tiktok: "https://tiktok.com",
} as const;

export const FOOTER_LINKS: readonly NavItem[] = [
  { id: "preface", href: "/" },
  { id: "journey", href: "/#tu-vo-den-tac-pham" },
  { id: "programs", href: "/chuong-trinh" },
  { id: "collection", href: "/bo-suu-tap" },
  { id: "handbook", href: "/cam-nang" },
  { id: "impact", href: "/tac-dong" },
  { id: "team", href: "/#nguoi-ke-chuyen" },
];
