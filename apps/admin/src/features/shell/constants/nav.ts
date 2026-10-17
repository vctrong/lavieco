import type { Permission } from "@lavieco/shared/permissions";

export type NavItem = {
  id: string;
  href: string;
  /** Hidden for staff without it (UX only; the services enforce it, docs/02 §9.3). */
  permission: Permission | null;
  /** False until the screen exists; shown as "coming soon", never as a dead link. */
  available: boolean;
};

export type NavGroup = { id: "operations" | "content" | "relations" | "system"; items: NavItem[] };

/**
 * One back office for everything (docs/05 decision): events and ticketing next to the
 * existing content, QR and lead screens. Events use the `events` domain name in code so
 * they never collide with `programs` (public program descriptions, `program_pages`).
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: "operations",
    items: [
      { id: "overview", href: "/", permission: null, available: true },
      { id: "events", href: "/events", permission: "program:read", available: false },
      { id: "orders", href: "/orders", permission: "order:read", available: false },
      { id: "checkin", href: "/checkin", permission: "checkin:perform", available: false },
    ],
  },
  {
    id: "content",
    items: [
      { id: "handbook", href: "/handbook", permission: "content:read", available: false },
      { id: "works", href: "/works", permission: "content:read", available: false },
      { id: "qr", href: "/qr", permission: "qr:read", available: false },
      { id: "programs", href: "/programs", permission: "content:read", available: false },
      { id: "pages", href: "/pages", permission: "content:read", available: false },
      { id: "media", href: "/media", permission: "content:read", available: false },
    ],
  },
  {
    id: "relations",
    items: [{ id: "leads", href: "/leads", permission: "lead:read", available: false }],
  },
  {
    id: "system",
    items: [
      { id: "users", href: "/users", permission: "user:read", available: false },
      { id: "audit", href: "/audit", permission: "audit:read", available: false },
      { id: "site", href: "/site", permission: "site:read", available: false },
    ],
  },
];
