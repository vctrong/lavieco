import type { LocalizedText } from "@lavieco/shared";
import { toSlug } from "@lavieco/shared";

/** Program type managed by admins (docs/03 §9.2). Archived types stay referenced. */
export type EventTypeRecord = {
  id: string;
  key: string;
  name: LocalizedText;
  sortOrder: number;
  archivedAt: Date | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

/** Stable key from the Vietnamese name; the unique index turns duplicates into a 409. */
export function eventTypeKey(name: LocalizedText): string {
  return toSlug(name.vi, 40) || "loai";
}

export function isSelectable(type: EventTypeRecord | null): type is EventTypeRecord {
  return type !== null && type.archivedAt === null;
}
