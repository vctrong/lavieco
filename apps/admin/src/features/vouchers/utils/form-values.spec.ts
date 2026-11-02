import { describe, expect, it } from "vitest";

import { voucherCreateRequestSchema } from "@lavieco/shared/events";

import { emptyValues, isoToLocal, localToIso, toVoucherRequest } from "./form-values";

describe("voucher form values", () => {
  it("turns a typed form into a valid request", () => {
    const body = toVoucherRequest({
      ...emptyValues(null),
      code: "thanthiet",
      name: "Khách thân thiết",
      discountType: "fixed",
      value: "20000",
      maxDiscount: "5000",
      eligibility: "allowlist",
      allowlist: "a@example.test\nb@example.test, c@example.test",
    });
    const parsed = voucherCreateRequestSchema.parse(body);
    expect(parsed.code).toBe("THANTHIET");
    expect(parsed.maxDiscount).toBeNull();
    expect(parsed.allowlist).toHaveLength(3);
  });

  it("leaves a typo for the schema to refuse", () => {
    const body = toVoucherRequest({ ...emptyValues(null), code: "ABC", name: "X", value: "abc" });
    expect(voucherCreateRequestSchema.safeParse(body).success).toBe(false);
  });

  it("requires the event of an event-scoped voucher", () => {
    const body = toVoucherRequest({ ...emptyValues("x"), code: "ABC", name: "X", eventId: "" });
    expect(voucherCreateRequestSchema.safeParse(body).success).toBe(false);
  });

  it("keeps Vietnam wall-clock time through a round trip", () => {
    expect(localToIso("2026-11-02T09:00")).toBe("2026-11-02T02:00:00.000Z");
    expect(isoToLocal("2026-11-02T02:00:00.000Z")).toBe("2026-11-02T09:00");
    expect(localToIso("")).toBeNull();
  });
});
