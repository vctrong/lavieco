import { z } from "zod";

import { TEXT } from "./constants/text";

const errors = TEXT.vi.errors;

/** "Coming soon" waitlist sign-up (UC-07). Email only, minimal data (BR-06). */
export const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, errors.emailRequired)
    .max(254, errors.email)
    // Full format check (local part, domain and TLD), not just "contains @".
    .pipe(z.email(errors.email)),
  consent: z.literal("yes", { error: errors.consent }),
  // Honeypot: real users never see or fill this field.
  website: z.string().max(0).optional(),
});

export type WaitlistInput = z.output<typeof waitlistSchema>;
