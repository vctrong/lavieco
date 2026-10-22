/**
 * Pages linked from the navigation, footer or CTAs that are not built yet. Each one
 * renders the shared `ComingSoonSection` (inside the site chrome) with its copy from
 * `text.ts` (`pages.<key>`). Remove an entry when the real page ships.
 */
export const COMING_SOON_PAGES = {
  story: { path: "/cau-chuyen", waitlist: true, suggestion: "programs" },
  collection: { path: "/bo-suu-tap", waitlist: true, suggestion: "programs" },
  handbook: { path: "/cam-nang", waitlist: true, suggestion: "programs" },
  impact: { path: "/tac-dong", waitlist: true, suggestion: "programs" },
  partnership: { path: "/hop-tac", waitlist: false, suggestion: "contact" },
  tickets: { path: "/tai-khoan/ve", waitlist: false, suggestion: "lookup" },
  registrations: { path: "/tai-khoan/chuong-trinh", waitlist: false, suggestion: "programs" },
} as const;

export type ComingSoonPageKey = keyof typeof COMING_SOON_PAGES;

/** Where the second button of a coming-soon page leads (a page that already exists). */
export const SUGGESTION_HREFS = {
  programs: "/chuong-trinh",
  contact: "/#lien-he",
  lookup: "/tra-cuu-ve",
} as const;

export const HOME_HREF = "/";
