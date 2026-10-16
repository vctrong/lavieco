import { describe, expect, it } from "vitest";

import { safeNextPath } from "./session-cookies";

describe("safeNextPath (no open redirect)", () => {
  it.each(["/tai-khoan", "/chuong-trinh/abc?x=1"])("keeps same-site path %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "",
    null,
    undefined,
  ])("falls back for %s", (value) => {
    expect(safeNextPath(value)).toBe("/tai-khoan");
  });
});
