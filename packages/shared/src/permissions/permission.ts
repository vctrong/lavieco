/**
 * Every permission the services check (docs/02 §9.3). Code checks permissions, never
 * role names. Adding one follows docs/04 §13.5 (update docs/01 §4.4 and docs/02 §9.3).
 */
export const PERMISSIONS = [
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
  // Events, ticketing and check-in (docs/05, ADR-0014).
  "program:read",
  "program:write",
  "order:read",
  "order:refund",
  "registration:export",
  "checkin:perform",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (PERMISSIONS as readonly string[]).includes(value);
}
