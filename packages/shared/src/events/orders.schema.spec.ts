import { describe, expect, it } from "vitest";

import { checkinRequestSchema, ticketCodeSchema } from "./checkin.schema";
import { orderCreateRequestSchema } from "./order.schema";

const valid = {
  eventSlug: "workshop-vo-so",
  items: [{ ticketTypeId: "a".repeat(24), quantity: 2 }],
  buyer: { fullName: "Nguyễn Văn A", email: "a@example.com", phone: "0901 234 567" },
  dataConsent: true,
  consentVersion: "2026-10",
  verificationToken: "x".repeat(40),
};

describe("orderCreateRequestSchema", () => {
  it("accepts a booker with a Vietnamese phone number and no prices", () => {
    const parsed = orderCreateRequestSchema.parse(valid);
    expect(parsed.answers).toEqual({});
    expect(parsed.safetyAcknowledged).toBe(false);
    expect("price" in parsed.items[0]!).toBe(false);
  });

  it("requires data consent (BR-06)", () => {
    expect(orderCreateRequestSchema.safeParse({ ...valid, dataConsent: false }).success).toBe(
      false,
    );
  });

  it("refuses a malformed phone number and a duplicated ticket type", () => {
    expect(
      orderCreateRequestSchema.safeParse({ ...valid, buyer: { ...valid.buyer, phone: "12345" } })
        .success,
    ).toBe(false);
    expect(
      orderCreateRequestSchema.safeParse({ ...valid, items: [...valid.items, ...valid.items] })
        .success,
    ).toBe(false);
  });

  it("has no field for attendee names (BR-13)", () => {
    const parsed = orderCreateRequestSchema.parse({ ...valid, attendees: [{ name: "B" }] });
    expect("attendees" in parsed).toBe(false);
  });
});

describe("check-in input", () => {
  it("normalises a typed ticket code", () => {
    expect(ticketCodeSchema.parse(" lvc-7k3q9m ")).toBe("LVC-7K3Q9M");
  });

  it("needs exactly one of qrToken or code", () => {
    const eventId = "b".repeat(24);
    expect(checkinRequestSchema.safeParse({ eventId }).success).toBe(false);
    expect(
      checkinRequestSchema.safeParse({ eventId, code: "LVC-7K3Q9M", qrToken: "a".repeat(43) })
        .success,
    ).toBe(false);
    expect(checkinRequestSchema.safeParse({ eventId, qrToken: "a".repeat(43) }).success).toBe(true);
  });
});
