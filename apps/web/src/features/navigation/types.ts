import type { Viewer } from "./schemas";

export type NavItem = {
  id: string;
  href: string;
};

/**
 * Where a primary link sits as the bar narrows (CSS breakpoints only, no measuring):
 * 1 = always inline; 2 = inline from 1280px, inside "Thêm" from 1024px;
 * 3 = inside "Khám phá" from 1280px, inside "Thêm" from 1024px.
 */
export type NavPriority = 1 | 2 | 3;

export type PrimaryNavItem = NavItem & {
  id: "story" | "programs" | "collection" | "handbook" | "impact";
  priority: NavPriority;
};

export type AccountLink = NavItem & {
  id: "tickets" | "registrations" | "profile";
};

/** What the account cluster shows. `loading` keeps the skeleton; `unknown` a neutral icon. */
export type ViewerState =
  { kind: "loading" } | { kind: "unknown" } | Exclude<Viewer, { kind: "needs_refresh" }>;

export type SignedInViewer = Extract<Viewer, { kind: "member" | "admin" }>;
