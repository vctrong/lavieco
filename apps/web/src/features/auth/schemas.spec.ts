import { describe, expect, it } from "vitest";

import { botFieldsSchema, loginSchema, signupCompleteSchema, signupDetailsSchema } from "./schemas";

const details = {
  displayName: "Nguyễn Văn A",
  email: " Khach@Example.test ",
  password: "vo so tay do",
  consent: "yes",
};

describe("auth form schemas", () => {
  it("accepts valid sign-up details and trims the email", () => {
    const parsed = signupDetailsSchema.parse(details);
    expect(parsed.email).toBe("Khach@Example.test");
  });

  it("requires the consent box (BR-06)", () => {
    const result = signupDetailsSchema.safeParse({ ...details, consent: undefined });
    expect(result.success).toBe(false);
  });

  it("refuses short passwords and malformed codes", () => {
    expect(signupDetailsSchema.safeParse({ ...details, password: "1234567" }).success).toBe(false);
    expect(
      signupCompleteSchema.safeParse({ ...details, challengeId: "x".repeat(22), code: "12a456" })
        .success,
    ).toBe(false);
  });

  it("gives Vietnamese messages", () => {
    const result = loginSchema.safeParse({ email: "sai", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join(" ")).toContain("Email");
    }
  });

  it("treats a filled honeypot as a bot", () => {
    expect(botFieldsSchema.safeParse({ website: "" }).success).toBe(true);
    expect(botFieldsSchema.safeParse({ website: "http://spam" }).success).toBe(false);
  });
});
