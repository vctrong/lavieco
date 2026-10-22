import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { FormQuestion } from "@lavieco/shared/events";

import type { TicketTypeRecord } from "../../ticketing";
import { newOrderCode, newQrToken, newTicketCode } from "./codes";
import { planSettlement, priceOrder, validateAnswers } from "./order";

const now = new Date("2026-10-20T03:00:00Z");

const ticketType = (overrides: Partial<TicketTypeRecord> = {}): TicketTypeRecord => ({
  id: "a".repeat(24),
  eventId: "e".repeat(24),
  name: "Vé tiêu chuẩn",
  description: "",
  price: 150_000,
  quantity: 20,
  saleStartAt: null,
  saleEndAt: null,
  maxPerOrder: 4,
  sortOrder: 0,
  hidden: false,
  sold: 0,
  held: 0,
  revision: 1,
  ...overrides,
});

describe("priceOrder", () => {
  it("prices from the stored ticket types, never from the client", () => {
    const result = priceOrder([ticketType()], [{ ticketTypeId: "a".repeat(24), quantity: 2 }], now);
    expect(result).toMatchObject({ amount: 300_000, ticketCount: 2 });
    expect(result.items[0]).toEqual({
      ticketTypeId: "a".repeat(24),
      name: "Vé tiêu chuẩn",
      unitPrice: 150_000,
      quantity: 2,
    });
  });

  it("refuses hidden, unknown, off-sale types and quantities over the limits", () => {
    const line = [{ ticketTypeId: "a".repeat(24), quantity: 1 }];
    for (const types of [
      [ticketType({ hidden: true })],
      [ticketType({ id: "b".repeat(24) })],
      [ticketType({ saleStartAt: new Date("2026-11-01T00:00:00Z") })],
      [ticketType({ saleEndAt: now })],
    ]) {
      expect(() => priceOrder(types, line, now)).toThrow("order.items_invalid");
    }
    expect(() =>
      priceOrder([ticketType()], [{ ticketTypeId: "a".repeat(24), quantity: 5 }], now),
    ).toThrow("order.items_invalid");
  });

  it("caps an order at 20 tickets whatever the types", () => {
    const types = ["1", "2", "3", "4", "5", "6"].map((digit) =>
      ticketType({ id: digit.repeat(24), maxPerOrder: 20 }),
    );
    const lines = types.map((type) => ({ ticketTypeId: type.id, quantity: 4 }));
    expect(() => priceOrder(types, lines, now)).toThrow("order.items_invalid");
  });
});

describe("validateAnswers", () => {
  const option = (label: string) => ({ id: randomUUID(), label });
  const choices = [option("Facebook"), option("Bạn bè")];
  const questions: FormQuestion[] = [
    {
      id: randomUUID(),
      type: "short_text",
      label: "Tên trường",
      description: "",
      required: true,
      options: [],
      hidden: false,
    },
    {
      id: randomUUID(),
      type: "single_choice",
      label: "Kênh",
      description: "",
      required: false,
      options: choices,
      hidden: false,
    },
    {
      id: randomUUID(),
      type: "multiple_choice",
      label: "Chủ đề",
      description: "",
      required: false,
      options: choices,
      hidden: false,
    },
  ];
  const [text, single, multi] = questions as [FormQuestion, FormQuestion, FormQuestion];

  it("keeps answers in question order and drops empty optional ones", () => {
    const result = validateAnswers(questions, {
      [multi.id]: [choices[0]!.id, choices[0]!.id, choices[1]!.id],
      [text.id]: "  THPT Châu Văn Liêm ",
      [single.id]: "",
    });
    expect(result).toEqual([
      { questionId: text.id, value: "THPT Châu Văn Liêm" },
      { questionId: multi.id, value: [choices[0]!.id, choices[1]!.id] },
    ]);
  });

  it("refuses a missing required answer, a foreign option, two options for a single choice and an unknown question", () => {
    expect(() => validateAnswers(questions, {})).toThrow("order.answers_invalid");
    const base = { [text.id]: "x" };
    expect(() => validateAnswers(questions, { ...base, [single.id]: randomUUID() })).toThrow(
      "order.answers_invalid",
    );
    expect(() =>
      validateAnswers(questions, { ...base, [single.id]: [choices[0]!.id, choices[1]!.id] }),
    ).toThrow("order.answers_invalid");
    expect(() => validateAnswers(questions, { ...base, [randomUUID()]: "x" })).toThrow(
      "order.answers_invalid",
    );
  });
});

describe("planSettlement (webhook and reconcile share it)", () => {
  it("converts a held pending order, retakes seats after expiry or cancellation", () => {
    expect(planSettlement({ status: "pending", seatState: "held", amount: 100 }, 100)).toEqual({
      kind: "convert_hold",
    });
    for (const status of ["expired", "cancelled"] as const) {
      expect(planSettlement({ status, seatState: "released", amount: 100 }, 100)).toEqual({
        kind: "retake_seats",
      });
    }
  });

  it("is idempotent once paid and never settles another amount", () => {
    expect(planSettlement({ status: "paid", seatState: "sold", amount: 100 }, 100).kind).toBe(
      "duplicate",
    );
    expect(
      planSettlement({ status: "refunded", seatState: "released", amount: 100 }, 100).kind,
    ).toBe("duplicate");
    expect(planSettlement({ status: "pending", seatState: "held", amount: 100 }, 99).kind).toBe(
      "amount_mismatch",
    );
  });

  it("never takes seats again once the event is cancelled (refund only)", () => {
    const cancelled = { eventCancelled: true };
    for (const status of ["expired", "cancelled"] as const) {
      expect(
        planSettlement({ status, seatState: "released", amount: 100 }, 100, cancelled).kind,
      ).toBe("refund_only");
    }
    expect(
      planSettlement({ status: "paid", seatState: "sold", amount: 100 }, 100, cancelled).kind,
    ).toBe("duplicate");
  });
});

describe("codes", () => {
  it("are random and well-formed", () => {
    const codes = new Set(Array.from({ length: 200 }, () => newTicketCode()));
    expect(codes.size).toBe(200);
    for (const code of codes) expect(code).toMatch(/^LVC-[0-9A-HJKMNP-TV-Z]{6}$/);
    const orderCode = newOrderCode();
    expect(Number.isSafeInteger(orderCode) && orderCode >= 1_000_000_000).toBe(true);
    expect(Buffer.from(newQrToken(), "base64url")).toHaveLength(32);
  });
});
