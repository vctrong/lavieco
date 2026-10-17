import { describe, expect, it } from "vitest";

import {
  assertCanAddTicketType,
  assertTicketTypeChangeAllowed,
  availabilityOf,
  hasRegistrations,
  pricingOf,
  seatsOf,
  type TicketTypeChanges,
  type TicketTypeRecord,
} from "./ticket-type";

function ticket(overrides: Partial<TicketTypeRecord> = {}): TicketTypeRecord {
  return {
    id: "64b7f0c2a1b2c3d4e5f60718",
    eventId: "64b7f0c2a1b2c3d4e5f60719",
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
  };
}

const changesOf = (record: TicketTypeRecord): TicketTypeChanges => ({
  name: record.name,
  description: record.description,
  price: record.price,
  quantity: record.quantity,
  saleStartAt: record.saleStartAt,
  saleEndAt: record.saleEndAt,
  maxPerOrder: record.maxPerOrder,
  sortOrder: record.sortOrder,
  hidden: record.hidden,
});

describe("pricingOf", () => {
  it("is free as soon as one visible ticket costs 0", () => {
    expect(pricingOf([ticket({ price: 0 }), ticket({ price: 120_000 })])).toEqual({
      isFree: true,
      priceFrom: 0,
    });
  });

  it("ignores hidden tickets and has no price without tickets", () => {
    expect(pricingOf([ticket({ price: 0, hidden: true }), ticket({ price: 90_000 })])).toEqual({
      isFree: false,
      priceFrom: 90_000,
    });
    expect(pricingOf([])).toEqual({ isFree: false, priceFrom: null });
  });
});

describe("availabilityOf", () => {
  it("shows nothing for unlimited quantities", () => {
    expect(availabilityOf([ticket({ quantity: null, sold: 500 })])).toEqual({
      soldOut: false,
      seatsLeft: null,
    });
  });

  it("shows seats left only at or below 10", () => {
    expect(availabilityOf([ticket({ quantity: 20, sold: 5 })]).seatsLeft).toBeNull();
    expect(availabilityOf([ticket({ quantity: 20, sold: 8, held: 2 })]).seatsLeft).toBe(10);
  });

  it("is sold out at zero", () => {
    expect(availabilityOf([ticket({ quantity: 5, sold: 5 })])).toEqual({
      soldOut: true,
      seatsLeft: null,
    });
  });
});

describe("ticket type changes after registrations", () => {
  it("allows anything while no seat is taken", () => {
    const current = ticket();
    expect(() =>
      assertTicketTypeChangeAllowed(current, { ...changesOf(current), price: 0, quantity: 1 }),
    ).not.toThrow();
  });

  it("freezes the price and the floor of the quantity once seats are taken", () => {
    const current = ticket({ sold: 3, held: 1 });
    expect(() =>
      assertTicketTypeChangeAllowed(current, { ...changesOf(current), price: 100_000 }),
    ).toThrow("ticket_type.locked");
    expect(() =>
      assertTicketTypeChangeAllowed(current, { ...changesOf(current), quantity: 3 }),
    ).toThrow("ticket_type.locked");
    expect(() =>
      assertTicketTypeChangeAllowed(current, { ...changesOf(current), quantity: 4, hidden: true }),
    ).not.toThrow();
  });

  it("detects registrations from held or sold seats", () => {
    expect(hasRegistrations([ticket()])).toBe(false);
    expect(hasRegistrations([ticket({ held: 1 })])).toBe(true);
  });
});

describe("limits and seats", () => {
  it("caps ticket types per event", () => {
    expect(() => assertCanAddTicketType(Array.from({ length: 10 }, () => ticket()))).toThrow(
      "ticket_type.limit_reached",
    );
  });

  it("sums capacity unless one ticket is unlimited", () => {
    expect(seatsOf([ticket({ quantity: 20, sold: 2 }), ticket({ quantity: 5 })])).toEqual({
      sold: 2,
      capacity: 25,
    });
    expect(seatsOf([ticket({ quantity: null })]).capacity).toBeNull();
  });
});
