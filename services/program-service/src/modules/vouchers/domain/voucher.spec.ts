import { describe, expect, it } from "vitest";

import {
  assertVoucherChangeAllowed,
  customerKeyOf,
  discountOf,
  quoteVoucher,
  toVoucherChanges,
  type VoucherContext,
  type VoucherRecord,
} from "./voucher";

const NOW = new Date("2026-11-02T00:00:00Z");
const EVENT = "e".repeat(24);
const TYPE = "c".repeat(24);
const TICKET = "a".repeat(24);

const voucher = (overrides: Partial<VoucherRecord> = {}): VoucherRecord => ({
  id: "f".repeat(24),
  code: "GIAM2NGUOI",
  name: "Giảm 10%",
  description: "",
  status: "active",
  scope: "event",
  eventId: EVENT,
  ticketTypeIds: [],
  excludedEventIds: [],
  eventTypeIds: [],
  discountType: "percent",
  value: 10,
  maxDiscount: null,
  minSeats: 1,
  minSubtotal: 0,
  eligibility: "everyone",
  minPaidOrders: 2,
  allowlist: [],
  totalUses: null,
  perCustomer: 1,
  startAt: null,
  endAt: null,
  visibility: "private",
  used: 0,
  held: 0,
  revision: 1,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const context = (overrides: Partial<VoucherContext> = {}): VoucherContext => ({
  eventId: EVENT,
  eventTypeId: TYPE,
  lines: [{ ticketTypeId: TICKET, unitPrice: 100_000, quantity: 2, seatsPerUnit: 1 }],
  email: "khach@example.test",
  userId: null,
  paidOrders: 0,
  now: NOW,
  ...overrides,
});

describe("discountOf", () => {
  it("rounds a percent down and applies its ceiling", () => {
    expect(discountOf({ discountType: "percent", value: 10, maxDiscount: null }, 99_999)).toBe(
      9_999,
    );
    expect(discountOf({ discountType: "percent", value: 50, maxDiscount: 20_000 }, 100_000)).toBe(
      20_000,
    );
  });

  it("never gives more than the amount", () => {
    expect(discountOf({ discountType: "fixed", value: 500_000, maxDiscount: null }, 100_000)).toBe(
      100_000,
    );
  });
});

describe("quoteVoucher", () => {
  it("prices the plan's examples", () => {
    expect(quoteVoucher(voucher({ minSeats: 2 }), context())).toBe(20_000);
    const loyal = voucher({
      scope: "global",
      eventId: null,
      discountType: "fixed",
      value: 20_000,
      eligibility: "loyal",
      minPaidOrders: 2,
    });
    expect(quoteVoucher(loyal, context({ paidOrders: 2 }))).toBe(20_000);
    expect(() => quoteVoucher(loyal, context({ paidOrders: 1 }))).toThrow("voucher.invalid");
  });

  it("counts people for the minimum, so one 2-person combo qualifies", () => {
    const lines = [{ ticketTypeId: TICKET, unitPrice: 180_000, quantity: 1, seatsPerUnit: 2 }];
    expect(quoteVoucher(voucher({ minSeats: 2 }), context({ lines }))).toBe(18_000);
    const one = [{ ticketTypeId: TICKET, unitPrice: 100_000, quantity: 1, seatsPerUnit: 1 }];
    expect(() => quoteVoucher(voucher({ minSeats: 2 }), context({ lines: one }))).toThrow(
      "voucher.invalid",
    );
  });

  it("applies only to the lines it covers", () => {
    const other = "b".repeat(24);
    const lines = [
      { ticketTypeId: TICKET, unitPrice: 100_000, quantity: 1, seatsPerUnit: 1 },
      { ticketTypeId: other, unitPrice: 300_000, quantity: 1, seatsPerUnit: 1 },
    ];
    expect(quoteVoucher(voucher({ ticketTypeIds: [TICKET] }), context({ lines }))).toBe(10_000);
    expect(() =>
      quoteVoucher(voucher({ ticketTypeIds: [other] }), context({ lines: [lines[0]!] })),
    ).toThrow("voucher.invalid");
  });

  it("refuses outside its status, window, event and audience", () => {
    const later = new Date(NOW.getTime() + 1000);
    for (const bad of [
      voucher({ status: "paused" }),
      voucher({ status: "archived" }),
      voucher({ startAt: later }),
      voucher({ endAt: NOW }),
      voucher({ eventId: "d".repeat(24) }),
      voucher({ scope: "global", eventId: null, excludedEventIds: [EVENT] }),
      voucher({ scope: "global", eventId: null, eventTypeIds: ["d".repeat(24)] }),
      voucher({ eligibility: "members" }),
      voucher({ eligibility: "allowlist", allowlist: ["ai.do@example.test"] }),
    ]) {
      expect(() => quoteVoucher(bad, context())).toThrow("voucher.invalid");
    }
  });

  it("knows new customers and allowlisted emails only from an email", () => {
    const fresh = voucher({ eligibility: "new_customer" });
    expect(quoteVoucher(fresh, context())).toBe(20_000);
    expect(() => quoteVoucher(fresh, context({ paidOrders: 1 }))).toThrow("voucher.invalid");
    expect(() => quoteVoucher(fresh, context({ email: null }))).toThrow("voucher.invalid");
    const listed = voucher({ eligibility: "allowlist", allowlist: ["khach@example.test"] });
    expect(quoteVoucher(listed, context({ email: "KHACH@example.test" }))).toBe(20_000);
  });

  it("refuses a free order: there is nothing to take off", () => {
    const lines = [{ ticketTypeId: TICKET, unitPrice: 0, quantity: 1, seatsPerUnit: 1 }];
    expect(() => quoteVoucher(voucher(), context({ lines }))).toThrow("voucher.invalid");
  });
});

describe("edits", () => {
  const changes = (overrides: Partial<VoucherRecord>) =>
    toVoucherChanges({
      ...voucher(overrides),
      startAt: null,
      endAt: null,
    } as Parameters<typeof toVoucherChanges>[0]);

  it("freezes the code once used and keeps limits above what is taken", () => {
    const used = voucher({ used: 3, held: 1, totalUses: 10 });
    expect(() => assertVoucherChangeAllowed(used, changes({ code: "KHAC" }))).toThrow(
      "voucher.locked",
    );
    expect(() => assertVoucherChangeAllowed(used, changes({ totalUses: 3 }))).toThrow(
      "voucher.locked",
    );
    expect(() => assertVoucherChangeAllowed(used, changes({ totalUses: 4 }))).not.toThrow();
  });

  it("drops fields of the other scope and normalises the allowlist", () => {
    const result = changes({
      scope: "global",
      eventId: EVENT,
      eligibility: "allowlist",
      allowlist: ["A@Example.test", "a@example.test"],
    });
    expect(result.eventId).toBeNull();
    expect(result.allowlist).toEqual(["a@example.test"]);
  });
});

describe("customerKeyOf", () => {
  it("is the member when signed in, the normalised email otherwise", () => {
    expect(customerKeyOf({ userId: "u1", email: "A@example.test" })).toBe("u1");
    expect(customerKeyOf({ userId: null, email: "A@example.test" })).toBe("a@example.test");
  });
});
