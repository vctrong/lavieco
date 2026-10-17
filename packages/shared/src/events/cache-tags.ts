/**
 * Next.js cache tags of public event data (docs/04 §15.2). program-service asks `web`
 * to revalidate them through the outbox whenever what the public sees changes.
 */
export const EVENT_CACHE_TAGS = {
  list: "program:events",
  item: (slug: string) => `program:events:${slug}`,
} as const;
