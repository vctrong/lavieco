import { z } from "zod";

/**
 * Active staff accounts, names only (ADR-0030): who can be assigned an order. Other
 * services call it with their service token; no email, no role, no personal data.
 */
export const staffDirectoryEntrySchema = z.object({ id: z.string(), name: z.string() });
export type StaffDirectoryEntry = z.infer<typeof staffDirectoryEntrySchema>;

export const staffDirectorySchema = z.object({ items: z.array(staffDirectoryEntrySchema) });
export type StaffDirectory = z.infer<typeof staffDirectorySchema>;
