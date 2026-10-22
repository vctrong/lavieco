import { describe, expect, it } from "vitest";

import type { PublicTicketType } from "@lavieco/shared/events";

import { initialQuantities } from "./initial-pick";

const ticket = (id: string, overrides: Partial<PublicTicketType> = {}): PublicTicketType => ({
  id,
  name: "Vé",
  description: "",
  price: 100_000,
  saleStartAt: null,
  saleEndAt: null,
  maxPerOrder: 4,
  availability: { soldOut: false, seatsLeft: null },
  ...overrides,
});

const A = "a".repeat(24);
const B = "b".repeat(24);

describe("initialQuantities", () => {
  it("uses the pick from the event page, capped by the order and seat limits", () => {
    expect(initialQuantities([ticket(A), ticket(B)], { ve: B, sl: "3" })).toEqual({ [B]: 3 });
    expect(initialQuantities([ticket(A)], { ve: A, sl: "9" })).toEqual({ [A]: 4 });
    expect(
      initialQuantities([ticket(A, { availability: { soldOut: false, seatsLeft: 2 } })], {
        ve: A,
        sl: "4",
      }),
    ).toEqual({ [A]: 2 });
  });

  it("ignores an unknown, sold-out or malformed pick", () => {
    expect(initialQuantities([ticket(A), ticket(B)], { ve: "x", sl: "1" })).toEqual({});
    expect(
      initialQuantities([ticket(A, { availability: { soldOut: true, seatsLeft: null } })], {
        ve: A,
        sl: "1",
      }),
    ).toEqual({});
    expect(initialQuantities([ticket(A), ticket(B)], { ve: A, sl: "1.5" })).toEqual({});
  });

  it("keeps the old default: one seat when there is a single ticket type", () => {
    expect(initialQuantities([ticket(A)])).toEqual({ [A]: 1 });
  });
});
