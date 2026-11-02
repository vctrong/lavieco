import { describe, expect, it } from "vitest";

import type { TicketTypeRecord } from "../../ticketing";
import { registrationBlocker } from "./registration";

const now = new Date("2026-10-20T03:00:00Z");
const event = {
  kind: "standard" as const,
  status: "published" as const,
  format: "offline" as const,
  hasOnlineLink: false,
  capacity: null,
  seatsSold: 0,
  seatsHeld: 0,
  startAt: new Date("2026-11-01T02:00:00Z"),
};
const ticket = (overrides: Partial<TicketTypeRecord> = {}): TicketTypeRecord => ({
  id: "a".repeat(24),
  eventId: "e".repeat(24),
  name: "Vé",
  description: "",
  price: 0,
  quantity: 10,
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
});

describe("registrationBlocker with a shared capacity", () => {
  const now = new Date("2026-10-20T00:00:00Z");
  it("is sold out when the event is full, whatever the ticket types have left", () => {
    const full = { ...event, capacity: 10, seatsSold: 8, seatsHeld: 2 };
    expect(registrationBlocker(full, [ticket()], now)).toBe("sold_out");
    expect(registrationBlocker({ ...full, seatsHeld: 1 }, [ticket()], now)).toBeNull();
  });
  it("is sold out when only a combo is left and it no longer fits", () => {
    const lastSeat = { ...event, capacity: 10, seatsSold: 9, seatsHeld: 0 };
    expect(registrationBlocker(lastSeat, [ticket({ seatsPerUnit: 2 })], now)).toBe("sold_out");
  });
});

describe("registrationBlocker", () => {
  it("is open for a published event with seats on sale", () => {
    expect(registrationBlocker(event, [ticket()], now)).toBeNull();
    expect(registrationBlocker(event, [ticket({ quantity: null, sold: 500 })], now)).toBeNull();
  });

  it("explains why registration is closed", () => {
    expect(registrationBlocker({ ...event, status: "closed" }, [ticket()], now)).toBe("not_open");
    expect(registrationBlocker({ ...event, startAt: now }, [ticket()], now)).toBe("event_started");
    expect(registrationBlocker({ ...event, format: "online" }, [ticket()], now)).toBe(
      "online_link_pending",
    );
    expect(
      registrationBlocker({ ...event, format: "online", hasOnlineLink: true }, [ticket()], now),
    ).toBeNull();
    expect(registrationBlocker(event, [ticket({ hidden: true })], now)).toBe("not_open");
    expect(
      registrationBlocker(event, [ticket({ saleStartAt: new Date("2026-10-25T00:00:00Z") })], now),
    ).toBe("sale_not_started");
    expect(registrationBlocker(event, [ticket({ saleEndAt: now })], now)).toBe("sale_ended");
    expect(registrationBlocker(event, [ticket({ sold: 6, held: 4 })], now)).toBe("sold_out");
  });
});
