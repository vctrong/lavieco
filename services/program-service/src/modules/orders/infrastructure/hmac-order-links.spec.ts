import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { HmacOrderLinks } from "./hmac-order-links";

const orderId = "6650a1b2c3d4e5f6a7b8c9d0";

describe("ticket links", () => {
  const links = new HmacOrderLinks(Buffer.from("test-secret-test-secret-test-secret"));
  const ticket = { id: "a".repeat(24), qrToken: "qr-one" };

  it("verifies a ticket's own link and reads its id", () => {
    const token = links.signTicket(ticket);
    expect(links.ticketIdOf(token)).toBe(ticket.id);
    expect(links.verifyTicket(token, ticket)).toBe(true);
  });

  it("stops working once the QR is reissued", () => {
    const token = links.signTicket(ticket);
    expect(links.verifyTicket(token, { ...ticket, qrToken: "qr-two" })).toBe(false);
  });

  it("is not interchangeable with an order link", () => {
    expect(links.verify(links.signTicket(ticket))).toBeNull();
  });
});

describe("HmacOrderLinks", () => {
  const links = new HmacOrderLinks(randomBytes(32));

  it("round-trips an order id", () => {
    expect(links.verify(links.sign(orderId))).toBe(orderId);
  });

  it("refuses a tampered id, a forged MAC and another secret's token", () => {
    const token = links.sign(orderId);
    const [, mac] = token.split(".");
    expect(links.verify(`6650a1b2c3d4e5f6a7b8c9d1.${mac}`)).toBeNull();
    expect(links.verify(`${orderId}.AAAA`)).toBeNull();
    expect(links.verify(new HmacOrderLinks(randomBytes(32)).sign(orderId))).toBeNull();
    expect(links.verify(orderId)).toBeNull();
  });
});
