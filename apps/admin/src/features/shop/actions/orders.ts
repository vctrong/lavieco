"use server";

import { objectIdSchema } from "@lavieco/shared";
import { shopOrderActionRequestSchema, type ShopOrderAdmin } from "@lavieco/shared/shop";

import { identityClient, programClient } from "@/lib/services";

import { callShop } from "../server/shop";
import type { ShopActionResult } from "../types";

const invalid = { status: "error", reason: "invalid" } as const;

/** Confirm COD, pack, ship (tracking), deliver, complete, cancel, return (`order:fulfill`). */
export async function actOnShopOrder(
  orderId: unknown,
  input: unknown,
): Promise<ShopActionResult<ShopOrderAdmin>> {
  const id = objectIdSchema.safeParse(orderId);
  const body = shopOrderActionRequestSchema.safeParse(input);
  if (!id.success || !body.success || body.data.action === "refund") return invalid;
  return callShop("shop.order.act", (token, rid) =>
    programClient().actOnShopOrder(token, id.data, body.data, rid),
  );
}

/** Records a manual refund (BR-15) after the TOTP code (step-up, ADR-0021). */
export async function refundShopOrder(
  orderId: unknown,
  input: unknown,
  code: unknown,
): Promise<ShopActionResult<ShopOrderAdmin>> {
  const id = objectIdSchema.safeParse(orderId);
  const body = shopOrderActionRequestSchema.safeParse(input);
  if (!id.success || !body.success || typeof code !== "string" || !/^\d{6}$/.test(code))
    return invalid;
  return callShop("shop.order.refund", async (token, rid) => {
    const { stepUpToken } = await identityClient().stepUp(token, code, rid);
    return programClient().refundShopOrder(
      token,
      id.data,
      { ...body.data, action: "refund" },
      stepUpToken,
      rid,
    );
  });
}
