import { z } from "zod";

import { INTEREST_VALUES, PHONE_PATTERN } from "./constants/config";
import { TEXT } from "./constants/text";

const errors = TEXT.vi.errors;

/** Individual gift / workshop request (UC-04). Minimal data only (BR-06). */
export const giftRequestSchema = z.object({
  name: z.string().trim().min(1, errors.name).max(120, errors.name),
  phone: z.string().trim().regex(PHONE_PATTERN, errors.phone),
  interest: z.enum(INTEREST_VALUES, { error: errors.interest }),
  consent: z.literal("yes", { error: errors.consent }),
  // Honeypot: real users never see or fill this field.
  website: z.string().max(0).optional(),
});

export type GiftRequestInput = z.output<typeof giftRequestSchema>;
