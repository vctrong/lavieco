import { z } from "zod";

import "@/shared/zod-vi";

import { normalizePhone } from "@lavieco/shared";
import {
  ORDER_LIMITS,
  orderAnswerValueSchema,
  type PublicEventDetail,
} from "@lavieco/shared/events";

import { ORDER_TOKEN_PATTERN } from "./constants/config";
import { TEXT } from "./constants/text";

const v = TEXT.vi.validation;

/** The booker (BR-13): checked in the browser for quick feedback, again on the server. */
export const buyerSchema = z.object({
  fullName: z.string().trim().min(1, v.fullName).max(ORDER_LIMITS.fullNameMax, v.fullName),
  email: z.string().trim().min(1, v.emailRequired).max(254, v.email).pipe(z.email(v.email)),
  phone: z
    .string()
    .trim()
    .min(1, v.phoneRequired)
    .max(20, v.phone)
    .refine((value) => value === "" || normalizePhone(value) !== null, v.phone),
});
export type BuyerInput = z.infer<typeof buyerSchema>;

/**
 * Everything the checkout form sends, before the email is verified. The server action
 * checks this; the form checks it too through `validateCheckoutDraft`, which adds the
 * event's own rules (program-service checks those again).
 */
export const checkoutDraftSchema = z.object({
  eventSlug: z.string().min(1).max(80),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().regex(/^[0-9a-f]{24}$/),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, TEXT.vi.errors.noTickets)
    .max(ORDER_LIMITS.itemsMax)
    .refine(
      (items) =>
        items.reduce((sum, item) => sum + item.quantity, 0) <= ORDER_LIMITS.ticketsPerOrderMax,
      TEXT.vi.errors.tooManyTickets,
    ),
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

/** What the event itself requires of the form (registration settings, docs/05 §5.1). */
export type CheckoutRules = Pick<
  PublicEventDetail["registration"],
  "questions" | "safetyAcknowledgementRequired" | "guardianConfirmationRequired"
>;

/** The form's values as typed, before any check (`dataConsent` may still be false). */
export type CheckoutDraftInput = Omit<CheckoutDraft, "dataConsent"> & { dataConsent: boolean };

const isEmptyAnswer = (value: unknown) =>
  value === undefined ||
  (Array.isArray(value) ? value.length === 0 : typeof value !== "string" || !value.trim());

/** Errors of the event's own rules: required questions and its extra check boxes. */
function ruleErrors(input: CheckoutDraftInput, rules: CheckoutRules): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const question of rules.questions) {
    if (question.required && isEmptyAnswer(input.answers[question.id])) {
      errors[question.id] =
        question.type === "short_text" || question.type === "paragraph" ? v.required : v.choose;
    }
  }
  if (rules.safetyAcknowledgementRequired && !input.safetyAcknowledged) errors.safety = v.consent;
  if (rules.guardianConfirmationRequired && !input.isGuardian) errors.guardian = v.consent;
  return errors;
}

/**
 * The form's check: `checkoutDraftSchema` (the same one the server action runs) plus
 * the event's rules. Every invalid field is reported at once, keyed by form field.
 */
export function validateCheckoutDraft(
  input: CheckoutDraftInput,
  rules: CheckoutRules,
): { success: true; data: CheckoutDraft } | { success: false; errors: Record<string, string> } {
  const parsed = checkoutDraftSchema.safeParse(input);
  const errors = {
    ...ruleErrors(input, rules),
    ...(parsed.success ? {} : fieldErrorsOf(parsed.error)),
  };
  if (parsed.success && Object.keys(errors).length === 0)
    return { success: true, data: parsed.data };
  return { success: false, errors };
}

/**
 * The form field behind a schema (or service) path: `buyer.email` → `email`,
 * `items.0.quantity` → `tickets`, `answers.<id>` → `<id>`. `null` when no field
 * of the form shows it.
 */
export function fieldKeyOf(path: readonly PropertyKey[] | string): string | null {
  const parts = typeof path === "string" ? path.split(".") : path.map(String);
  const [head, next] = parts;
  switch (head) {
    case "buyer":
      return next ?? null;
    case "items":
      return "tickets";
    case "answers":
      return next ?? null;
    case "dataConsent":
      return "dataConsent";
    case "safetyAcknowledged":
      return "safety";
    case "isGuardian":
      return "guardian";
    case "email":
      return "email";
    default:
      return null;
  }
}

/** First message per form field, in schema order. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = fieldKeyOf(issue.path);
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export const otpCodeSchema = z.string().regex(/^\d{6}$/);
export const challengeIdSchema = z.string().min(10).max(64);
export const orderTokenSchema = z.string().regex(ORDER_TOKEN_PATTERN);
