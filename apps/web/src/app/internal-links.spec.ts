import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

// Feature indexes also export server code; only their link constants are used here.
vi.mock("server-only", () => ({}));
vi.mock("next/font/google", () => ({
  Playwrite_VN: () => ({ className: "", variable: "", style: {} }),
}));

const { COMING_SOON_HREFS } = await import("@/features/coming-soon");
const { HOME_ROUTES, HOME_SECTION_IDS } = await import("@/features/home");
const { NAVIGATION_HREFS } = await import("@/features/navigation");
const { NOT_FOUND_HREFS } = await import("@/features/not-found");
const { TEAM_SECTION_ID } = await import("@/features/team");

const APP_DIR = fileURLToPath(new URL(".", import.meta.url));

/** Route patterns of the app (`/chuong-trinh/[slug]`), from its page and route files. */
function routePatterns(dir: string, segments: string[] = []): string[][] {
  const entries = readdirSync(dir);
  const here = entries.some((name) => /^(page|route)\.tsx?$/.test(name)) ? [segments] : [];
  return [
    ...here,
    ...entries
      .filter((name) => statSync(join(dir, name)).isDirectory())
      .flatMap((name) => {
        // Route groups and parallel slots do not appear in the URL.
        const inUrl = !/^\(.*\)$/.test(name) && !name.startsWith("@");
        return routePatterns(join(dir, name), inUrl ? [...segments, name] : segments);
      }),
  ];
}

// The `(site)/[...missing]` catch-all answers 404 for anything: it must not count.
const ROUTES = routePatterns(APP_DIR).filter(
  (pattern) => !pattern.some((segment) => segment.startsWith("[...")),
);

function routeExists(path: string): boolean {
  const parts = path.split("/").filter(Boolean);
  return ROUTES.some(
    (pattern) =>
      pattern.length === parts.length &&
      pattern.every((segment, index) => segment.startsWith("[") || segment === parts[index]),
  );
}

const ANCHORS = new Set<string>([...Object.values(HOME_SECTION_IDS), TEAM_SECTION_ID]);

const HREFS = [
  ...new Set([
    ...NAVIGATION_HREFS,
    ...Object.values(HOME_ROUTES),
    ...COMING_SOON_HREFS,
    ...NOT_FOUND_HREFS,
  ]),
];

describe("internal links of the navigation, footer and CTAs", () => {
  it("finds the app routes", () => {
    expect(routeExists("/chuong-trinh")).toBe(true);
    expect(routeExists("/chuong-trinh/mot-chuong-trinh")).toBe(true);
    expect(routeExists("/khong-co-trang-nay")).toBe(false);
  });

  it.each(HREFS)("%s points to a page that exists", (href) => {
    const [pathAndQuery = "", anchor] = href.split("#");
    const path = pathAndQuery.split("?")[0] || "/";
    expect(routeExists(path), `no route for ${path}`).toBe(true);
    // An anchor link must land on a section the home page renders.
    if (anchor) {
      expect(path).toBe("/");
      expect(ANCHORS.has(anchor), `no #${anchor} on the home page`).toBe(true);
    }
  });
});
