import { describe, expect, it } from "vitest";

import { can } from "./can";
import { PERMISSIONS, type Permission } from "./permission";
import { ROLES, ROLE_PERMISSIONS, permissionsForRoles, type Role } from "./roles";

/**
 * The authorization matrix of docs/02 §9.3 (derived from docs/01 §4.4), written out
 * cell by cell. If this test fails, either the code or the documents drifted: fix
 * the one that is wrong and update the other in the same change (docs/04 §13.5).
 *
 * Columns: super_admin, content_editor, coordinator, auditor.
 */
const MATRIX: Record<Permission, [boolean, boolean, boolean, boolean]> = {
  "content:read": [true, true, true, true],
  "content:write": [true, true, false, false],
  "content:publish": [true, true, false, false],
  "qr:read": [true, true, true, true],
  "qr:manage": [true, true, false, false],
  "site:read": [true, true, false, true],
  "site:write": [true, true, false, false],
  "site:system": [true, false, false, false],
  "lead:read": [true, false, true, true],
  "lead:write": [true, false, true, false],
  "lead:export": [true, false, true, false],
  "user:read": [true, false, false, true],
  "user:manage": [true, false, false, false],
  "audit:read": [true, false, false, true],
  "privacy:process": [true, false, false, false],
  "program:read": [true, true, true, true],
  "program:write": [true, false, true, false],
  "order:read": [true, false, true, true],
  "order:refund": [true, false, true, false],
  "registration:export": [true, false, true, false],
  "checkin:perform": [true, false, true, false],
  "impact:approve": [true, false, false, false],
};

const COLUMNS: readonly Role[] = ["super_admin", "content_editor", "coordinator", "auditor"];

describe("role → permission matrix", () => {
  it("covers every permission and every role", () => {
    expect(Object.keys(MATRIX).sort()).toEqual([...PERMISSIONS].sort());
    expect([...COLUMNS].sort()).toEqual([...ROLES].sort());
  });

  for (const permission of PERMISSIONS) {
    COLUMNS.forEach((role, column) => {
      const expected = MATRIX[permission][column];
      it(`${role} ${expected ? "has" : "lacks"} ${permission}`, () => {
        expect(ROLE_PERMISSIONS[role].includes(permission)).toBe(expected);
      });
    });
  }

  it("lists no permission twice for a role", () => {
    for (const role of ROLES) {
      expect(new Set(ROLE_PERMISSIONS[role]).size).toBe(ROLE_PERMISSIONS[role].length);
    }
  });

  it("merges permissions of several roles", () => {
    const merged = permissionsForRoles(["content_editor", "coordinator"]);
    expect(merged).toContain("content:publish");
    expect(merged).toContain("checkin:perform");
    expect(merged).not.toContain("user:manage");
  });

  it("can() denies when there is no user", () => {
    expect(can(null, "content:read")).toBe(false);
    expect(can({ roles: ["auditor"] }, "audit:read")).toBe(true);
    expect(can({ roles: ["auditor"] }, "lead:export")).toBe(false);
  });
});
