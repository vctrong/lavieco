import { describe, expect, it } from "vitest";

import { SHOP_SETTINGS_DEFAULTS } from "@lavieco/shared/shop";

import {
  allowedActions,
  codAllowed,
  isShopOrderCode,
  maskEmail,
  maskPhone,
  newPublicCode,
  newShopOrderCode,
  shippingFeeOf,
} from "./shop-order";

const settings = {
  ...SHOP_SETTINGS_DEFAULTS,
  freeShippingFrom: 300_000 as number | null,
  pickup: { ...SHOP_SETTINGS_DEFAULTS.pickup },
  cod: { ...SHOP_SETTINGS_DEFAULTS.cod },
};

describe("shippingFeeOf (BR-21)", () => {
  it("charges the flat fee, nothing for pickup or above the free threshold", () => {
    expect(shippingFeeOf(settings, "delivery", 100_000)).toBe(20_000);
    expect(shippingFeeOf(settings, "pickup", 100_000)).toBe(0);
    expect(shippingFeeOf(settings, "delivery", 300_000)).toBe(0);
  });
});

describe("codAllowed (Q-S4)", () => {
  it("allows cash on delivery up to 200.000đ only", () => {
    expect(codAllowed(settings, 200_000)).toBe(true);
    expect(codAllowed(settings, 200_001)).toBe(false);
    expect(codAllowed({ ...settings, cod: { enabled: false, maxAmount: 200_000 } }, 50_000)).toBe(
      false,
    );
  });
});

describe("order codes", () => {
  it("keeps shop codes apart from ticket codes", () => {
    const code = newShopOrderCode();
    expect(isShopOrderCode(code)).toBe(true);
    expect(isShopOrderCode(9_999_999_999)).toBe(false);
    expect(newPublicCode()).toMatch(/^LVS-[0-9A-HJKMNP-TV-Z]{6}$/);
  });
});

describe("allowedActions", () => {
  it("follows the status and the payment", () => {
    expect(
      allowedActions({ status: "awaiting_confirmation", paymentMethod: "cod", paidAt: null }),
    ).toEqual(["confirm", "cancel"]);
    expect(allowedActions({ status: "paid", paymentMethod: "payos", paidAt: new Date() })).toEqual(
      expect.arrayContaining(["pack", "ship", "cancel", "refund"]),
    );
    expect(allowedActions({ status: "shipped", paymentMethod: "cod", paidAt: null })).toContain(
      "mark_cod_paid",
    );
    expect(allowedActions({ status: "shipped", paymentMethod: "cod", paidAt: null })).not.toContain(
      "refund",
    );
  });
});

describe("masking", () => {
  it("never shows the full email or phone on the order link", () => {
    expect(maskEmail("trong@gmail.com")).toBe("tr***@gmail.com");
    expect(maskPhone("0912345789")).toBe("***789");
  });
});
