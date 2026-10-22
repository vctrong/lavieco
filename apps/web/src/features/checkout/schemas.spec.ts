import { describe, expect, it } from "vitest";

import { TEXT } from "./constants/text";
import {
  buyerSchema,
  fieldKeyOf,
  orderTokenSchema,
  validateCheckoutDraft,
  type CheckoutDraftInput,
  type CheckoutRules,
} from "./schemas";

const v = TEXT.vi.validation;
const QUESTION_ID = "1adc7089-7836-4643-aace-1185a547c27b";

const RULES: CheckoutRules = {
  questions: [
    {
      id: QUESTION_ID,
      type: "single_choice",
      label: "Bạn biết đến chương trình qua đâu?",
      description: "",
      required: true,
      options: [{ id: "8f7d4a52-0b55-4b1e-9d5b-6f0e3a1c2d4e", label: "Facebook" }],
    },
  ],
  safetyAcknowledgementRequired: true,
  guardianConfirmationRequired: true,
};

const VALID: CheckoutDraftInput = {
  eventSlug: "workshop-gia-dinh-chuong-gio-vo-oc",
  items: [{ ticketTypeId: "6650a1b2c3d4e5f6a7b8c9d0", quantity: 1 }],
  buyer: { fullName: "Nguyễn Văn A", email: "a@example.test", phone: "0901 234 567" },
  answers: { [QUESTION_ID]: "8f7d4a52-0b55-4b1e-9d5b-6f0e3a1c2d4e" },
  note: "",
  dataConsent: true,
  safetyAcknowledged: true,
  isGuardian: true,
};

describe("checkout schemas", () => {
  it("accepts a Vietnamese phone number and refuses a malformed one", () => {
    const buyer = { fullName: "Nguyễn Văn A", email: "a@example.com", phone: "0901 234 567" };
    expect(buyerSchema.safeParse(buyer).success).toBe(true);
    expect(buyerSchema.safeParse({ ...buyer, phone: "12345" }).success).toBe(false);
    expect(buyerSchema.safeParse({ ...buyer, email: "khong-phai-email" }).success).toBe(false);
  });

  it("only takes signed order links, never a bare order code", () => {
    expect(orderTokenSchema.safeParse(`${"a".repeat(24)}.${"b".repeat(43)}`).success).toBe(true);
    expect(orderTokenSchema.safeParse("1234567890").success).toBe(false);
  });
});

describe("validateCheckoutDraft (the form's check)", () => {
  it("passes a complete form", () => {
    expect(validateCheckoutDraft(VALID, RULES).success).toBe(true);
  });

  // An empty form lists every missing field at once (the summary and the focus need
  // them all), including the event's question and check boxes.
  it("reports every missing field of an empty form in one go", () => {
    const result = validateCheckoutDraft(
      {
        ...VALID,
        items: [],
        buyer: { fullName: "", email: "", phone: "" },
        answers: {},
        dataConsent: false,
        safetyAcknowledged: false,
        isGuardian: false,
      },
      RULES,
    );
    expect(result).toEqual({
      success: false,
      errors: {
        tickets: TEXT.vi.errors.noTickets,
        fullName: v.fullName,
        email: v.emailRequired,
        phone: v.phoneRequired,
        [QUESTION_ID]: v.choose,
        dataConsent: v.consent,
        safety: v.consent,
        guardian: v.consent,
      },
    });
  });

  it("tells a malformed value from a missing one", () => {
    const result = validateCheckoutDraft(
      { ...VALID, buyer: { ...VALID.buyer, email: "ban@", phone: "12345" } },
      RULES,
    );
    expect(result).toEqual({ success: false, errors: { email: v.email, phone: v.phone } });
  });

  it("asks for a typed answer differently from a choice", () => {
    const rules = {
      ...RULES,
      questions: [{ ...RULES.questions[0]!, type: "short_text" as const, options: [] }],
    };
    const result = validateCheckoutDraft({ ...VALID, answers: { [QUESTION_ID]: "  " } }, rules);
    expect(result).toEqual({ success: false, errors: { [QUESTION_ID]: v.required } });
  });

  it("keeps the event's check boxes optional when the event does not ask for them", () => {
    const rules = {
      questions: [],
      safetyAcknowledgementRequired: false,
      guardianConfirmationRequired: false,
    };
    const input = { ...VALID, answers: {}, safetyAcknowledged: false, isGuardian: false };
    expect(validateCheckoutDraft(input, rules).success).toBe(true);
  });

  it("refuses more than the tickets allowed in one order", () => {
    const result = validateCheckoutDraft(
      { ...VALID, items: [{ ticketTypeId: "6650a1b2c3d4e5f6a7b8c9d0", quantity: 21 }] },
      RULES,
    );
    expect(result.success).toBe(false);
    expect(result.success ? null : Object.keys(result.errors)).toEqual(["tickets"]);
  });
});

describe("fieldKeyOf", () => {
  it.each([
    ["buyer.email", "email"],
    ["items.0.quantity", "tickets"],
    [`answers.${QUESTION_ID}`, QUESTION_ID],
    ["safetyAcknowledged", "safety"],
    ["isGuardian", "guardian"],
    ["dataConsent", "dataConsent"],
    ["verificationToken", null],
  ])("%s → %s", (path, field) => {
    expect(fieldKeyOf(path)).toBe(field);
  });
});
