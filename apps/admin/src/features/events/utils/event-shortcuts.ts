import type { EventListItem } from "@lavieco/shared/events";
import { can, type Permission, type Role } from "@lavieco/shared/permissions";

export type EventShortcut = { key: "registrations" | "orders" | "checkin"; href: string };

const SHORTCUTS: {
  key: EventShortcut["key"];
  permission: Permission;
  href: (id: string) => string;
}[] = [
  { key: "registrations", permission: "order:read", href: (id) => `/events/${id}/registrations` },
  { key: "orders", permission: "order:read", href: (id) => `/orders?eventId=${id}` },
  { key: "checkin", permission: "checkin:perform", href: (id) => `/checkin/${id}` },
];

/**
 * Day-to-day links of a row in `/events`, hidden without the permission (the service
 * still checks it). Only bookable events that left draft have orders or a door.
 */
export function eventShortcuts(
  event: Pick<EventListItem, "id" | "kind" | "status">,
  staff: { roles: readonly Role[] },
): EventShortcut[] {
  if (event.kind !== "standard" || event.status === "draft") return [];
  return SHORTCUTS.filter(
    (shortcut) =>
      can(staff, shortcut.permission) &&
      // No door once ended or cancelled (cancelled tickets are void anyway).
      (shortcut.key !== "checkin" || (event.status !== "ended" && event.status !== "cancelled")),
  ).map((shortcut) => ({ key: shortcut.key, href: shortcut.href(event.id) }));
}
