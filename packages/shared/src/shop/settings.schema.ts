import { z } from "zod";

import { SHOP_LIMITS } from "./limits";

/**
 * Defaults decided on 17/11/2026 (docs/08): 20.000đ delivery, cash on delivery only up to
 * 200.000đ, returns of faulty goods within 14 days, goods held 15 minutes while paying.
 */
export const SHOP_SETTINGS_DEFAULTS = {
  shippingFee: 20_000,
  freeShippingFrom: null,
  pickup: { enabled: true, address: "Cần Thơ", note: "" },
  cod: { enabled: true, maxAmount: 200_000 },
  holdMinutes: 15,
  returnDays: 14,
} as const;

const money = z.number().int().min(0).max(SHOP_LIMITS.priceMax);

export const shopSettingsInputSchema = z.object({
  shippingFee: money,
  /** Orders at or above this subtotal ship free; null = never. */
  freeShippingFrom: money.nullable(),
  pickup: z.object({
    enabled: z.boolean(),
    address: z.string().trim().max(300),
    note: z.string().trim().max(300),
  }),
  cod: z.object({
    enabled: z.boolean(),
    /** COD only when the amount to pay is at or below this (Q-S4). */
    maxAmount: money,
  }),
  holdMinutes: z.number().int().min(5).max(60),
  returnDays: z.number().int().min(0).max(90),
});
export type ShopSettingsInput = z.infer<typeof shopSettingsInputSchema>;

export const shopSettingsSchema = shopSettingsInputSchema.extend({ revision: z.number().int() });
export type ShopSettings = z.infer<typeof shopSettingsSchema>;

/** `revision: 0` saves the defaults for the first time. */
export const shopSettingsUpdateRequestSchema = shopSettingsInputSchema.extend({
  revision: z.number().int().min(0),
});
export type ShopSettingsUpdateRequest = z.infer<typeof shopSettingsUpdateRequestSchema>;

/** What `web` needs to show delivery and payment choices; no internal fields. */
export const publicShopSettingsSchema = shopSettingsInputSchema.omit({ holdMinutes: true });
export type PublicShopSettings = z.infer<typeof publicShopSettingsSchema>;
