import { describe, expect, it } from "vitest";

import { buyerSchema, orderTokenSchema } from "./schemas";

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
