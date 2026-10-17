import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";

const typeNameSchema = z.object({
  vi: z.string().trim().min(1).max(60),
  en: z.string().trim().max(60).optional(),
});

/** Program type managed by admins (seed: Workshop, Talkshow, Triển lãm). */
export const eventTypeSchema = z.object({
  id: objectIdSchema,
  /** Stable key derived from the Vietnamese name when created; never changes. */
  key: z.string(),
  name: typeNameSchema,
  sortOrder: z.number().int(),
  archived: z.boolean(),
  revision: z.number().int(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type EventType = z.infer<typeof eventTypeSchema>;

export const eventTypeListSchema = z.object({ items: z.array(eventTypeSchema) });
export type EventTypeList = z.infer<typeof eventTypeListSchema>;

export const eventTypeListQuerySchema = z.object({
  includeArchived: z.stringbool().default(false),
});
export type EventTypeListQuery = z.infer<typeof eventTypeListQuerySchema>;

export const eventTypeCreateRequestSchema = z.object({
  name: typeNameSchema,
  sortOrder: z.number().int().min(0).max(999).default(100),
});
export type EventTypeCreateRequest = z.infer<typeof eventTypeCreateRequestSchema>;

/** Rename, reorder, archive or restore. Archived types disappear from pickers only. */
export const eventTypeUpdateRequestSchema = z.object({
  revision: z.number().int().min(1),
  name: typeNameSchema.optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  archived: z.boolean().optional(),
});
export type EventTypeUpdateRequest = z.infer<typeof eventTypeUpdateRequestSchema>;

/** What the public site needs for its filter chips. */
export const publicEventTypeSchema = z.object({
  id: objectIdSchema,
  key: z.string(),
  name: typeNameSchema,
});
export type PublicEventType = z.infer<typeof publicEventTypeSchema>;

export const publicEventTypeListSchema = z.object({ items: z.array(publicEventTypeSchema) });
export type PublicEventTypeList = z.infer<typeof publicEventTypeListSchema>;
