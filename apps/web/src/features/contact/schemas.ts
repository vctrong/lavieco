import { z } from "zod";

import { INTEREST_VALUES, PHONE_PATTERN } from "./constants/config";
import { TEXT } from "./constants/text";

const errors = TEXT.vi.errors;

/** Organization lead form (UC-05/06). Used on the client for UX and again in the server action. */
export const organizationLeadSchema = z.object({
  name: z.string().trim().min(1, errors.name).max(120, errors.name),
  organization: z.string().trim().min(1, errors.organization).max(160, errors.organization),
  phone: z.string().trim().regex(PHONE_PATTERN, errors.phone),
  interest: z.enum(INTEREST_VALUES, { error: errors.interest }),
  message: z.string().trim().max(1000, errors.message),
  consent: z.literal("yes", { error: errors.consent }),
  // Honeypot: real users never see or fill this field.
  website: z.string().max(0).optional(),
});

export type OrganizationLeadInput = z.output<typeof organizationLeadSchema>;
