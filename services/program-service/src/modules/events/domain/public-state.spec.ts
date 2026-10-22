import { describe, expect, it } from "vitest";

import { isFewSeats, type TicketTypeRecord } from "../../ticketing";
import { publicStateOf } from "./public-state";

const now = new Date("2026-10-20T03:00:00Z");
const event = {
  kind: "standard" as const,
  status: "published" as const,
  format: "offline" as const,
  hasOnlineLink: false,
  startAt: new Date("2026-11-01T02:00:00Z"),
  endAt: new Date("2026-11-01T05:00:00Z"),
};
const ticket = (overrides: Partial<TicketTypeRecord> = {}): TicketTypeRecord => ({
  id: "a".repeat(24),
  eventId: "e".repeat(24),
  name: "Vé",
  description: "",
  price: 0,
  quantity: 40,
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

describe("publicStateOf", () => {
  it("is open with plenty of seats, or unlimited ones", () => {
    expect(publicStateOf(event, [ticket()], now)).toBe("open");
    expect(publicStateOf(event, [ticket({ quantity: null, sold: 900 })], now)).toBe("open");
  });

  it("counts held seats as taken (pending payments)", () => {
    // 40 seats: 20% = 8. 31 sold + 1 held leaves 8.
    expect(publicStateOf(event, [ticket({ sold: 31, held: 1 })], now)).toBe("few_left");
    expect(publicStateOf(event, [ticket({ sold: 31 })], now)).toBe("open");
    expect(publicStateOf(event, [ticket({ sold: 30, held: 10 })], now)).toBe("sold_out");
  });

  it("reports the other booking blockers", () => {
    const later = new Date("2026-10-25T00:00:00Z");
    expect(publicStateOf(event, [ticket({ saleStartAt: later })], now)).toBe("upcoming_sale");
    expect(publicStateOf({ ...event, format: "online" }, [ticket()], now)).toBe(
      "online_link_pending",
    );
    expect(publicStateOf(event, [ticket({ saleEndAt: now })], now)).toBe("closed");
    expect(publicStateOf({ ...event, status: "closed" }, [ticket()], now)).toBe("closed");
  });

  it("is ended once the end time passed, even before an admin ends it", () => {
    expect(publicStateOf({ ...event, endAt: now }, [ticket()], now)).toBe("ended");
    expect(publicStateOf({ ...event, status: "ended" }, [ticket()], now)).toBe("ended");
    expect(publicStateOf({ ...event, kind: "past", status: "ended" }, [], now)).toBe("ended");
  });

  it("puts cancelled above every other state", () => {
    expect(publicStateOf({ ...event, status: "cancelled", endAt: now }, [], now)).toBe("cancelled");
  });
});

describe("isFewSeats", () => {
  it("uses 20% of the capacity or 5 seats, whichever allows more", () => {
    expect(isFewSeats(5, 10)).toBe(true);
    expect(isFewSeats(6, 10)).toBe(false);
    expect(isFewSeats(20, 100)).toBe(true);
    expect(isFewSeats(21, 100)).toBe(false);
    expect(isFewSeats(0, 100)).toBe(false);
  });
});
