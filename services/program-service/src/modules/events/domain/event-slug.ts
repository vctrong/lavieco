import { toSlug } from "@lavieco/shared";
import { EVENT_LIMITS } from "@lavieco/shared/events";

const DUPLICATE_SUFFIX = "ban-sao";

/** Base slug of a new event (title) or of a copy (`<slug>-ban-sao`). */
export function baseSlug(title: string): string {
  const slug = toSlug(title, EVENT_LIMITS.slugMax - 4);
  return slug.length >= 3 ? slug : `su-kien-${slug}`.replace(/-$/, "");
}

export function duplicateBaseSlug(slug: string): string {
  const trimmed = slug.slice(0, EVENT_LIMITS.slugMax - DUPLICATE_SUFFIX.length - 5);
  return `${trimmed.replace(/-+$/, "")}-${DUPLICATE_SUFFIX}`;
}

/** First free slug among `base`, `base-2`, `base-3`… given the slugs already used. */
export function firstFreeSlug(base: string, used: ReadonlySet<string>): string {
  if (!used.has(base)) return base;
  for (let index = 2; ; index += 1) {
    const candidate = `${base}-${index}`;
    if (!used.has(candidate)) return candidate;
  }
}
