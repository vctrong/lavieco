import { describe, expect, it } from "vitest";

import {
  assertCanAddTicketType,
  assertTicketTypeChangeAllowed,
  availabilityOf,
  hasRegistrations,
  priceRangeOf,
  pricingOf,
  seatsLeftOf,
  seatsOf,
  unitsLeftOf,
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
    seatsPerUnit: 1,
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
  seatsPerUnit: record.seatsPerUnit,
  sortOrder: record.sortOrder,
  hidden: record.hidden,
});

describe("pricingOf", () => {
  it("is free only when every visible ticket costs 0 (since 22/10/2026)", () => {
    expect(pricingOf([ticket({ price: 0 }), ticket({ price: 0 })])).toEqual({
      isFree: true,
      priceFrom: 0,
    });
    expect(pricingOf([ticket({ price: 0 }), ticket({ price: 120_000 })])).toEqual({
      isFree: false,
      priceFrom: 0,
    });
  });

  it("gives the visible price range", () => {
    expect(priceRangeOf([ticket({ price: 90_000 }), ticket({ price: 150_000 })])).toEqual({
      min: 90_000,
      max: 150_000,
    });
    expect(priceRangeOf([ticket({ price: 0, hidden: true })])).toBeNull();
  });

  it("ignores hidden tickets and has no price without tickets", () => {
    expect(pricingOf([ticket({ price: 0, hidden: true }), ticket({ price: 90_000 })])).toEqual({
      isFree: false,
      priceFrom: 90_000,
    });
    expect(pricingOf([])).toEqual({ isFree: false, priceFrom: null });
  });
});

describe("combos and the shared capacity", () => {
  const combo = (overrides: Partial<TicketTypeRecord> = {}) =>
    ticket({ seatsPerUnit: 2, quantity: 10, ...overrides });

  it("counts people, not units", () => {
    expect(seatsLeftOf(combo({ sold: 8 }))).toBe(4);
    expect(availabilityOf([combo({ sold: 8 })]).seatsLeft).toBe(4);
    expect(seatsOf([combo({ sold: 3 }), ticket({ quantity: 5, sold: 1 })])).toEqual({
      sold: 7,
      capacity: 25,
    });
  });

  it("caps every type by what the event still has", () => {
    const event = { capacity: 10, seatsSold: 7, seatsHeld: 0 };
    expect(unitsLeftOf(combo(), event)).toBe(1);
    expect(unitsLeftOf(ticket({ quantity: null }), event)).toBe(3);
    expect(seatsOf([combo()], event).capacity).toBe(10);
  });

  it("is sold out when no type fits, even with a seat left", () => {
    const lastSeat = { capacity: 10, seatsSold: 9, seatsHeld: 0 };
    expect(availabilityOf([combo()], lastSeat).soldOut).toBe(true);
    expect(availabilityOf([combo(), ticket({ quantity: 5 })], lastSeat).soldOut).toBe(false);
  });

  it("freezes the people per unit once seats are taken", () => {
    const current = combo({ sold: 1 });
    expect(() =>
      assertTicketTypeChangeAllowed(current, { ...changesOf(current), seatsPerUnit: 3 }),
    ).toThrow("ticket_type.locked");
    const unsold = combo();
    expect(() =>
      assertTicketTypeChangeAllowed(unsold, { ...changesOf(unsold), seatsPerUnit: 3 }),
    ).not.toThrow();
  });
});

describe("availabilityOf", () => {
  it("shows nothing for unlimited quantities", () => {
    expect(availabilityOf([ticket({ quantity: null, sold: 500 })])).toEqual({
      soldOut: false,
      seatsLeft: null,
    });
  });

  it("shows seats left only when few remain (≤ 20% or ≤ 5), held seats included", () => {
    expect(availabilityOf([ticket({ quantity: 20, sold: 10 })]).seatsLeft).toBeNull();
    expect(availabilityOf([ticket({ quantity: 20, sold: 13, held: 2 })]).seatsLeft).toBe(5);
    expect(availabilityOf([ticket({ quantity: 100, sold: 80 })]).seatsLeft).toBe(20);
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
