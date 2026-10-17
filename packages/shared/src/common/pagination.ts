import { z } from "zod";

/** Cursor pagination request (docs/02 §6.1): `cursor` is opaque to the caller. */
export const cursorPageQuerySchema = z.object({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CursorPageQuery = z.infer<typeof cursorPageQuerySchema>;

/** Builds the response schema of a cursor-paginated list. */
export function cursorPageSchema<TItem extends z.ZodType>(item: TItem) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
}
