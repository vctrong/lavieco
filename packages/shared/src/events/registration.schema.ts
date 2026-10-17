import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import { cursorPageSchema } from "../common/pagination";
import { orderStatusSchema, ticketStatusSchema } from "./order.schema";

/** Registrations of one event: one row per ticket, the booker repeated (docs/05 §5.8). */
export const registrationListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  /** Refunded orders are left out unless asked for. */
  includeRefunded: z.stringbool().default(false),
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type RegistrationListQuery = z.infer<typeof registrationListQuerySchema>;

/** A column per custom question, hidden ones included (BR-17: old answers still export). */
export const registrationColumnSchema = z.object({
  questionId: z.uuid(),
  label: z.string(),
  hidden: z.boolean(),
});
export type RegistrationColumn = z.infer<typeof registrationColumnSchema>;

export const registrationRowSchema = z.object({
  orderId: objectIdSchema,
  orderCode: z.number().int(),
  orderStatus: orderStatusSchema,
  buyer: z.object({ fullName: z.string(), email: z.string(), phone: z.string() }),
  ticketCode: z.string(),
  ticketTypeName: z.string(),
  ticketStatus: ticketStatusSchema,
  checkedInAt: isoDateTimeSchema.nullable(),
  registeredAt: isoDateTimeSchema,
  /** `questionId` → answer as text (choices joined with ", "). */
  answers: z.record(z.string(), z.string()),
});
export type RegistrationRow = z.infer<typeof registrationRowSchema>;

export const registrationListSchema = cursorPageSchema(registrationRowSchema).extend({
  columns: z.array(registrationColumnSchema),
});
export type RegistrationList = z.infer<typeof registrationListSchema>;

export const registrationExportQuerySchema = z.object({
  includeRefunded: z.stringbool().default(false),
});
export type RegistrationExportQuery = z.infer<typeof registrationExportQuerySchema>;
