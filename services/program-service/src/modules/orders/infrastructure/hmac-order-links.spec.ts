import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { HmacOrderLinks } from "./hmac-order-links";

const orderId = "6650a1b2c3d4e5f6a7b8c9d0";

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
