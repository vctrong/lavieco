import { describe, expect, it } from "vitest";

import { isNavItemActive } from "./is-nav-item-active";

describe("isNavItemActive", () => {
  it("matches the home route exactly", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/cau-chuyen", "/")).toBe(false);
  });

  it("matches a route and its sub-paths by prefix", () => {
    expect(isNavItemActive("/cam-nang", "/cam-nang")).toBe(true);
    expect(isNavItemActive("/cam-nang/vo-so", "/cam-nang")).toBe(true);
  });

  it("does not match a route that only shares a text prefix", () => {
    expect(isNavItemActive("/cam-nang-khac", "/cam-nang")).toBe(false);
    expect(isNavItemActive("/tac-dong", "/cam-nang")).toBe(false);
  });

  it("ignores the hash part of an href", () => {
    expect(isNavItemActive("/", "/#nguoi-ke-chuyen")).toBe(true);
    expect(isNavItemActive("/cau-chuyen", "/#nguoi-ke-chuyen")).toBe(false);
  });
});
