import type { Permission } from "./permission";

/** Staff roles (docs/01 §4.2). Roles are constants in code, never data in the DB. */
export const ROLES = ["super_admin", "content_editor", "coordinator", "auditor"] as const;

export type Role = (typeof ROLES)[number];

/**
 * Role → permissions. Mirrors docs/01 §4.4 and docs/02 §9.3; `roles.spec.ts` pins
 * the matrix so that any change here is deliberate (docs/04 §13.5).
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  super_admin: [
    "content:read",
    "content:write",
    "content:publish",
    "qr:read",
    "qr:manage",
    "site:read",
    "site:write",
    "site:system",
    "lead:read",
    "lead:write",
    "lead:export",
    "user:read",
    "user:manage",
    "audit:read",
    "privacy:process",
    "program:read",
    "program:write",
    "order:read",
    "order:refund",
    "registration:export",
    "checkin:perform",
  ],
  content_editor: [
    "content:read",
    "content:write",
    "content:publish",
    "qr:read",
    "qr:manage",
    "site:read",
    "site:write",
    "program:read",
  ],
  coordinator: [
    "content:read",
    "qr:read",
    "lead:read",
    "lead:write",
    "lead:export",
    "program:read",
    "program:write",
    "order:read",
    "order:refund",
    "registration:export",
    "checkin:perform",
  ],
  auditor: [
    "content:read",
    "qr:read",
    "site:read",
    "lead:read",
    "user:read",
    "audit:read",
    "program:read",
    "order:read",
  ],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Union of the permissions granted by a set of roles (a person may hold several). */
export function permissionsForRoles(roles: readonly Role[]): Permission[] {
  const granted = new Set<Permission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role]) granted.add(permission);
  }
  return [...granted];
}
