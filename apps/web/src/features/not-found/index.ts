import type { Metadata } from "next";

import { HOME_HREF, SUGGESTED_LINKS } from "./constants/config";
import { TEXT } from "./constants/text";

export { NotFoundPage } from "./components/not-found-page";

export const notFoundMetadata: Metadata = {
  title: TEXT.vi.metaTitle,
  robots: { index: false, follow: true },
};

/** Every internal link of the 404 page, for the route check. */
export const NOT_FOUND_HREFS: readonly string[] = [
  HOME_HREF,
  ...SUGGESTED_LINKS.map((link) => link.href),
];
