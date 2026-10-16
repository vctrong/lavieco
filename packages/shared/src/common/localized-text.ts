import { z } from "zod";

/** User-facing text stored per language; Vietnamese first, English later (docs/03 §1.2). */
export const localizedTextSchema = z.object({
  vi: z.string(),
  en: z.string().optional(),
});

export type LocalizedText = z.infer<typeof localizedTextSchema>;
