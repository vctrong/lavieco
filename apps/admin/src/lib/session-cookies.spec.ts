import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { RETURN_SECTIONS, safeNextPath } from "./session-cookies";

const DASHBOARD = fileURLToPath(new URL("../app/(dashboard)", import.meta.url));

/** Whether a folder holds a `page.tsx` at any depth. */
function hasPage(dir: string): boolean {
  return readdirSync(dir, { withFileTypes: true }).some((entry) =>
    entry.isDirectory() ? hasPage(join(dir, entry.name)) : entry.name === "page.tsx",
  );
}

describe("safeNextPath", () => {
  it("keeps paths of known admin sections, with their query and hash", () => {
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath("/events")).toBe("/events");
    expect(safeNextPath("/events/abc/registrations?trang=2#top")).toBe(
      "/events/abc/registrations?trang=2#top",
    );
    expect(safeNextPath("/orders/123")).toBe("/orders/123");
  });

  it("sends paths of other apps or unknown sections home", () => {
    expect(safeNextPath("/dang-nhap")).toBe("/");
    expect(safeNextPath("/eventsx")).toBe("/");
    expect(safeNextPath("/login")).toBe("/");
  });

  it("refuses absolute, protocol-relative and backslash URLs (no open redirect)", () => {
    for (const value of [
      "https://evil.example/events",
      "//evil.example/events",
      "/\\evil.example/events",
      "/events\\..\\..\\x",
      "javascript:alert(1)",
      "",
      null,
      undefined,
    ]) {
      expect(safeNextPath(value)).toBe("/");
    }
  });

  it("uses the given fallback", () => {
    expect(safeNextPath("/dang-nhap", "/events")).toBe("/events");
  });

  it("lists exactly the dashboard sections that have pages", () => {
    const sections = readdirSync(DASHBOARD, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && hasPage(join(DASHBOARD, entry.name)))
      .map((entry) => `/${entry.name}`)
      .sort();
    expect([...RETURN_SECTIONS].sort()).toEqual(sections);
    for (const section of RETURN_SECTIONS) {
      expect(existsSync(join(DASHBOARD, section.slice(1)))).toBe(true);
    }
  });
});
