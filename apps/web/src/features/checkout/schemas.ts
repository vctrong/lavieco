import { z } from "zod";

import { normalizePhone } from "@lavieco/shared";
import { ORDER_LIMITS, orderAnswerValueSchema } from "@lavieco/shared/events";

import { ORDER_TOKEN_PATTERN } from "./constants/config";
import { TEXT } from "./constants/text";

const v = TEXT.vi.validation;

/** The booker (BR-13): checked in the browser for quick feedback, again on the server. */
export const buyerSchema = z.object({
  fullName: z.string().trim().min(1, v.fullName).max(ORDER_LIMITS.fullNameMax, v.fullName),
  email: z.string().trim().max(254, v.email).pipe(z.email(v.email)),
  phone: z
    .string()
    .trim()
    .max(20, v.phone)
    .refine((value) => normalizePhone(value) !== null, v.phone),
});
export type BuyerInput = z.infer<typeof buyerSchema>;

/** Everything the checkout form sends, before the email is verified. */
export const checkoutDraftSchema = z.object({
  eventSlug: z.string().min(1).max(80),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().regex(/^[0-9a-f]{24}$/),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(ORDER_LIMITS.itemsMax),
  buyer: buyerSchema,
  answers: z.record(z.uuid(), orderAnswerValueSchema),
  note: z.string().trim().max(ORDER_LIMITS.noteMax),
  dataConsent: z.literal(true, { error: v.consent }),
  safetyAcknowledged: z.boolean(),
  isGuardian: z.boolean(),
  /** Honeypot: humans leave it empty. */
  website: z.string().max(200).optional(),
  turnstileToken: z.string().max(4096).optional(),
});
export type CheckoutDraft = z.infer<typeof checkoutDraftSchema>;

export const otpCodeSchema = z.string().regex(/^\d{6}$/);
export const challengeIdSchema = z.string().min(10).max(64);
export const orderTokenSchema = z.string().regex(ORDER_TOKEN_PATTERN);
