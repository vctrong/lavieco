import { z } from "zod";

import { DEFAULT_FREE_SHIPPING_WARD_CODES } from "../geo";
import { SHOP_LIMITS } from "./limits";

/**
 * Defaults decided on 17/11/2026 (docs/08): 20.000đ delivery, cash on delivery only up to
 * 200.000đ, returns of faulty goods within 14 days, goods held 15 minutes while paying.
 * 20/11/2026: pickup at FPT University Cần Thơ (free) and free delivery to the wards of
 * the former Ninh Kiều district.
 */
export const SHOP_SETTINGS_DEFAULTS = {
  shippingFee: 20_000,
  freeShippingFrom: null,
  freeShippingWardCodes: [...DEFAULT_FREE_SHIPPING_WARD_CODES] as number[],
  pickup: { enabled: true, address: "Trường Đại học FPT Cần Thơ", note: "" },
  cod: { enabled: true, maxAmount: 200_000 },
  holdMinutes: 15,
  returnDays: 14,
} as const;

const money = z.number().int().min(0).max(SHOP_LIMITS.priceMax);

export const shopSettingsInputSchema = z.object({
  shippingFee: money,
  /** Orders at or above this subtotal ship free; null = never. */
  freeShippingFrom: money.nullable(),
  /** Wards (codes of `@lavieco/shared/geo`) delivered free, whatever the amount. */
  freeShippingWardCodes: z.array(z.number().int().positive()).max(200),
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
