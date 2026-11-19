import { describe, expect, it } from "vitest";

import {
  assertDueDay,
  computeTotals,
  dueStateOf,
  manualOrderCode,
  salesPaymentOfShop,
  salesStatusOfShop,
  vnDay,
} from "./sales-order";

describe("computeTotals", () => {
  it("adds the lines, the delivery fee and takes the discount off", () => {
    const totals = computeTotals(
      [
        { unitPrice: 45_000, quantity: 2 },
        { unitPrice: 140_000, quantity: 2 },
      ],
      0,
      160_000,
    );
    expect(totals).toEqual({
      subtotal: 370_000,
      shippingFee: 0,
      discount: 160_000,
      total: 210_000,
    });
  });

  it("rejects a discount larger than what is owed", () => {
    expect(() => computeTotals([{ unitPrice: 30_000, quantity: 1 }], 10_000, 40_001)).toThrow(
      "sales_order.totals_invalid",
    );
  });
});

describe("assertDueDay", () => {
  it("requires a due day for made-to-order", () => {
    expect(() => assertDueDay("made_to_order", "new", null)).toThrow(
      "sales_order.due_day_required",
    );
  });

  it("lets a cancelled made-to-order order have none", () => {
    expect(() => assertDueDay("made_to_order", "cancelled", null)).not.toThrow();
  });

  it("does not ask it of other types", () => {
    expect(() => assertDueDay("in_stock", "new", null)).not.toThrow();
  });
});

describe("dueStateOf", () => {
  const today = "2026-11-20";
  it.each([
    [{ dueDay: "2026-11-19", status: "new" }, "overdue"],
    [{ dueDay: "2026-11-20", status: "in_progress" }, "today"],
    [{ dueDay: "2026-11-21", status: "shipping" }, "later"],
    [{ dueDay: "2026-11-01", status: "completed" }, "none"],
    [{ dueDay: "2026-11-01", status: "cancelled" }, "none"],
    [{ dueDay: null, status: "new" }, "none"],
  ] as const)("%o is %s", (order, expected) => {
    expect(dueStateOf(order, today)).toBe(expected);
  });
});

describe("codes and days", () => {
  it("pads manual codes to four digits", () => {
    expect(manualOrderCode(1)).toBe("LV-0001");
    expect(manualOrderCode(12345)).toBe("LV-12345");
  });

  it("counts the day in Asia/Ho_Chi_Minh", () => {
    expect(vnDay(new Date("2026-11-19T17:30:00Z"))).toBe("2026-11-20");
  });
});

describe("website orders", () => {
  it("maps the twelve shop statuses onto the five of the book", () => {
    expect(salesStatusOfShop("awaiting_payment")).toBe("new");
    expect(salesStatusOfShop("packing")).toBe("in_progress");
    expect(salesStatusOfShop("shipped")).toBe("shipping");
    expect(salesStatusOfShop("delivered")).toBe("completed");
    expect(salesStatusOfShop("expired")).toBe("cancelled");
  });

  it("is paid once the money is in, unpaid again after a refund", () => {
    const at = new Date();
    expect(salesPaymentOfShop({ status: "paid", paidAt: at })).toBe("paid");
    expect(salesPaymentOfShop({ status: "awaiting_confirmation", paidAt: null })).toBe("unpaid");
    expect(salesPaymentOfShop({ status: "refunded", paidAt: at })).toBe("unpaid");
  });
});
