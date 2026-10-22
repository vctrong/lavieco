import type { Metadata } from "next";

import {
  COMING_SOON_PAGES,
  HOME_HREF,
  SUGGESTION_HREFS,
  type ComingSoonPageKey,
} from "./constants/pages";
import { TEXT } from "./constants/text";

export { ComingSoonPage } from "./components/coming-soon-page";
export { ComingSoonSection } from "./components/coming-soon-section";
export type { ComingSoonPageKey } from "./constants/pages";

export const comingSoonMetadata: Metadata = { title: TEXT.vi.metaTitle };

/** Metadata of a page not built yet: its own title, kept out of search results. */
export function comingSoonPageMetadata(page: ComingSoonPageKey): Metadata {
  const copy = TEXT.vi.pages[page];
  return {
    title: TEXT.vi.section.metaTitle(copy.title),
    description: copy.description,
    robots: { index: false, follow: true },
  };
}

/** Every internal link of the coming-soon pages, for the route check. */
export const COMING_SOON_HREFS: readonly string[] = [
  HOME_HREF,
  ...Object.values(SUGGESTION_HREFS),
  ...Object.values(COMING_SOON_PAGES).map((page) => page.path),
];
