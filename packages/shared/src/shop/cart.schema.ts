import { z } from "zod";

import { objectIdSchema } from "../common/object-id";
import { mediaImageSchema } from "../media/media.schema";

/** Carts (UC-36, docs/08 §4.6): never hold stock (BR-22); prices are recomputed every read. */
export const CART_LIMITS = { lines: 50, perLine: 10 } as const;

/** Opaque token of the `lv_cart` cookie; only its hash is stored. */
export const cartTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);

export const cartItemSetRequestSchema = z.object({
  quantity: z.number().int().min(0).max(CART_LIMITS.perLine),
});
export type CartItemSetRequest = z.infer<typeof cartItemSetRequestSchema>;

export const cartClaimRequestSchema = z.object({ token: cartTokenSchema });

/** Why a line cannot be bought as asked; the page explains it line by line. */
export const CART_LINE_ISSUES = ["unavailable", "reduced"] as const;

export const cartLineSchema = z.object({
  variantId: objectIdSchema,
  productSlug: z.string(),
  title: z.string(),
  optionLabel: z.string(),
  sku: z.string(),
  image: mediaImageSchema.nullable(),
  unitPrice: z.number().int(),
  compareAtPrice: z.number().int().nullable(),
  quantity: z.number().int(),
  /** What can be bought now (stock, per-line cap). */
  maxQuantity: z.number().int(),
  lineTotal: z.number().int(),
  issue: z.enum(CART_LINE_ISSUES).nullable(),
});
export type CartLine = z.infer<typeof cartLineSchema>;

export const cartSchema = z.object({
  lines: z.array(cartLineSchema),
  count: z.number().int(),
  subtotal: z.number().int(),
});
export type Cart = z.infer<typeof cartSchema>;
