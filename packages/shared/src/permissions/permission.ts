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
  /** Publish an impact figure such as a typed attendance count (BR-09). */
  "impact:approve",
  /** Create, edit and pause vouchers; their allowlists hold personal data. */
  "voucher:write",
  /** Surveys and their responses (which may hold personal data). */
  "survey:read",
  "survey:write",
  /** Bulk email: audiences hold personal data, and it reaches people outside. */
  "campaign:send",
  // Shop (ADR-0028). Shop orders share the `order` resource with ticket orders.
  "product:read",
  "product:write",
  /** Publish, hide or archive a product (BR-20 checked by the service). */
  "product:publish",
  /** Bulk import from Excel/CSV. */
  "product:import",
  /** Confirm cash on delivery, pack, ship, deliver, cancel shop orders; moderate reviews. */
  "order:fulfill",
  /** Excel export of shop orders: personal data, step-up and audit. */
  "order:export",
  // Digital Green Handbook (ADR-0029): pages are images, versioned as a whole book.
  "handbook:read",
  "handbook:write",
  /** Publish or restore a version: self-publish, no second reviewer (BR-26). */
  "handbook:publish",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (PERMISSIONS as readonly string[]).includes(value);
}
