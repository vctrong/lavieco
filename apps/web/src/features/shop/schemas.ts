import "@/shared/zod-vi";

import { z } from "zod";

import { shippingMethodSchema, shopPaymentMethodSchema } from "@lavieco/shared/shop";

/** Checkout form (client for feedback, server again in the action). */
export const shopCheckoutFormSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    email: z.email().max(254),
    phone: z
      .string()
      .trim()
      .regex(/^(\+84|0)\d{9,10}$/),
    method: shippingMethodSchema,
    sameRecipient: z.boolean(),
    recipientName: z.string().trim().max(100),
    recipientPhone: z.string().trim().max(15),
    line: z.string().trim().max(200),
    ward: z.string().trim().max(100),
    province: z.string().trim().max(100),
    note: z.string().trim().max(500),
    paymentMethod: shopPaymentMethodSchema,
    voucherCode: z.string().trim().max(30),
    consent: z.literal(true),
    website: z.string().max(200).optional(),
    turnstileToken: z.string().max(4_000).optional(),
  })
  .superRefine((value, ctx) => {
    const require = (path: string, ok: boolean) => {
      if (!ok) ctx.addIssue({ code: "custom", path: [path], message: "required" });
    };
    if (value.method === "delivery") {
      require("line", value.line.length >= 3);
      require("ward", value.ward.length >= 1);
      require("province", value.province.length >= 1);
    }
    if (!value.sameRecipient) {
      require("recipientName", value.recipientName.length >= 2);
      require("recipientPhone", /^(\+84|0)\d{9,10}$/.test(value.recipientPhone));
    }
  });
export type ShopCheckoutForm = z.infer<typeof shopCheckoutFormSchema>;

export const otpCodeSchema = z.string().regex(/^\d{6}$/);
export const challengeIdSchema = z.string().min(8).max(200);
export const orderLinkSchema = z
  .string()
  .min(20)
  .max(200)
  .regex(/^[A-Za-z0-9._-]+$/);
