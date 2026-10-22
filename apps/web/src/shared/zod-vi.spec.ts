import { describe, expect, it } from "vitest";
import type { z } from "zod";

import {
  loginSchema,
  resetCompleteSchema,
  resetRequestSchema,
  signupDetailsSchema,
} from "@/features/auth/schemas";
import { buyerSchema, checkoutDraftSchema } from "@/features/checkout/schemas";
import { waitlistSchema } from "@/features/coming-soon/schemas";
import { organizationLeadSchema } from "@/features/contact/schemas";
import { giftRequestSchema } from "@/features/gift-request/schemas";

import { viErrorMap } from "./zod-vi";

/** Raw Zod wording (English defaults) that must never reach a form. */
const RAW = /Invalid|Expected|expected|received|Too (small|big)|Required|String must/;

const SCHEMAS: [string, z.ZodType][] = [
  ["login", loginSchema],
  ["signup", signupDetailsSchema],
  ["reset request", resetRequestSchema],
  ["reset complete", resetCompleteSchema],
  ["checkout buyer", buyerSchema],
  ["checkout draft", checkoutDraftSchema],
  ["waitlist", waitlistSchema],
  ["organization lead", organizationLeadSchema],
  ["gift request", giftRequestSchema],
];

/** Inputs that hit missing fields, wrong types, wrong formats and lengths. */
const INPUTS: unknown[] = [
  {},
  null,
  "chuoi",
  {
    email: 42,
    password: [],
    displayName: "",
    consent: "no",
    name: "x".repeat(500),
    phone: {},
    interest: "khac",
    items: "nhieu",
    buyer: { fullName: 1 },
    answers: [],
    dataConsent: "yes",
  },
  { email: "ban@", code: "12", newPassword: "ngan", challengeId: 3, organization: "" },
];

describe("form schemas never show raw Zod messages", () => {
  it.each(SCHEMAS)("%s", (_name, schema) => {
    for (const input of INPUTS) {
      const parsed = schema.safeParse(input);
      if (parsed.success) continue;
      for (const issue of parsed.error.issues) {
        expect(issue.message, JSON.stringify(issue.path)).not.toMatch(RAW);
        expect(issue.message.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("viErrorMap", () => {
  it("has a Vietnamese answer for every kind of issue, with a default for odd ones", () => {
    const issues = [
      { code: "invalid_type", expected: "string", input: undefined },
      { code: "invalid_type", expected: "string", input: 3 },
      { code: "too_small", origin: "string", minimum: 1, input: "" },
      { code: "too_small", origin: "string", minimum: 8, input: "abc" },
      { code: "too_big", origin: "string", maximum: 80, input: "x" },
      { code: "too_small", origin: "array", minimum: 1, input: [] },
      { code: "invalid_format", format: "email", input: "a@" },
      { code: "invalid_format", format: "regex", input: "a" },
      { code: "invalid_value", values: ["yes"], input: "no" },
      { code: "unrecognized_keys", keys: ["x"], input: {} },
      { code: "custom", input: 1 },
    ];
    for (const issue of issues) {
      const message = viErrorMap(issue as Parameters<typeof viErrorMap>[0]);
      expect(typeof message).toBe("string");
      expect(String(message)).not.toMatch(RAW);
    }
  });
});
