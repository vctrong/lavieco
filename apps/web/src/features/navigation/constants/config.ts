import type { AccountLink, NavItem, PrimaryNavItem } from "../types";

/** Set to true once EN content and the URL strategy (PQ3) exist. */
export const LANGUAGE_SWITCH_ENABLED = false;

/** The bar shrinks after this many pixels of scroll (design.md §7.5.3). */
export const DOCK_SHRINK_SCROLL_Y = 120;

/** Primary links. Copy lives in text.ts under the same `id`; `priority` is explained in types.ts. */
export const NAV_ITEMS: readonly PrimaryNavItem[] = [
  { id: "story", href: "/cau-chuyen", priority: 1 },
  { id: "programs", href: "/chuong-trinh", priority: 1 },
  { id: "collection", href: "/bo-suu-tap", priority: 2 },
  { id: "handbook", href: "/cam-nang", priority: 3 },
  { id: "impact", href: "/tac-dong", priority: 3 },
];

/**
 * "Hợp tác" opens the contact section of the home page, where the partnership form for
 * schools, businesses and partners already works. TODO(partnership-page): back to
 * "/hop-tac" once that page exists (it is a coming-soon page for now).
 */
export const CTA_HREF = "/#lien-he";

/** Member space; signed-out visitors are sent to the sign-in page by `proxy.ts`. */
export const ACCOUNT_HREF = "/tai-khoan";

export const SIGN_IN_HREF = "/dang-nhap";

/** Links of the account menu. Copy lives in text.ts under the same `id`. */
export const ACCOUNT_LINKS: readonly AccountLink[] = [
  // TODO(nav-account-routes): a coming-soon page until the member ticket list exists.
  { id: "tickets", href: "/tai-khoan/ve" },
  // TODO(nav-account-routes): a coming-soon page until the registered-programs page exists.
  { id: "registrations", href: "/tai-khoan/chuong-trinh" },
  { id: "profile", href: ACCOUNT_HREF },
];

/** BFF endpoint answering who is viewing (no token, no internal id). */
export const VIEWER_ENDPOINT = "/api/account/viewer";

/** Rotates the member refresh token (Route Handler of the auth feature). */
export const SESSION_REFRESH_ENDPOINT = "/api/auth/refresh?tiep=/";

/** Web Lock name: one tab at a time rotates the refresh token. */
export const SESSION_REFRESH_LOCK = "lavieco-auth-refresh";

/**
 * Pages whose flows sign in or out (login, sign-up, password reset, account). The
 * account cluster lives in the layout and does not re-render on navigation, so it
 * asks the viewer again when the visitor leaves one of these pages.
 */
export const SESSION_PAGES: readonly string[] = [
  "/dang-nhap",
  "/dang-ky",
  "/quen-mat-khau",
  ACCOUNT_HREF,
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

/** Every internal link of the bar, the account menu and the footer (route check). */
export const NAVIGATION_HREFS: readonly string[] = [
  ...NAV_ITEMS.map((item) => item.href),
  CTA_HREF,
  ACCOUNT_HREF,
  SIGN_IN_HREF,
  ...ACCOUNT_LINKS.map((link) => link.href),
  ...SESSION_PAGES,
  ...FOOTER_LINKS.map((link) => link.href),
];
