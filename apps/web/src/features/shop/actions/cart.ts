"use server";

import { isServiceProblem } from "@lavieco/api-clients";
import { objectIdSchema } from "@lavieco/shared";
import { CART_LIMITS, type Cart } from "@lavieco/shared/shop";

import { ensureCartToken, readCartToken } from "@/lib/cart-cookie";
import { withMemberToken } from "@/lib/member-token";
import { requestId } from "@/lib/request-meta";
import { programClient, webLogger } from "@/lib/services";

export type CartResult =
  { status: "ok"; cart: Cart } | { status: "error"; reason: "sold_out" | "full" | "unavailable" };

const EMPTY: Cart = { lines: [], count: 0, subtotal: 0 };

function failed(error: unknown, context: string): CartResult {
  if (isServiceProblem(error) && error.code === "cart.unavailable")
    return { status: "error", reason: "sold_out" };
  if (isServiceProblem(error) && error.code === "cart.full")
    return { status: "error", reason: "full" };
  webLogger().warn("cart action failed", {
    context,
    errorCode: isServiceProblem(error) ? error.code : "unavailable",
  });
  return { status: "error", reason: "unavailable" };
}

/**
 * The cart of this browser. A signed-in member's cart is claimed on the way (merged with
 * the one from their other devices), which is why this is an action and not a GET.
 */
export async function loadCart(): Promise<CartResult> {
  try {
    const id = await requestId();
    const token = await readCartToken();
    const claimed = token
      ? await withMemberToken(id, (access) => programClient().claimCart(access, token, id))
      : { session: "none" as const };
    if (claimed.session === "ok") return { status: "ok", cart: claimed.value };
    return { status: "ok", cart: token ? await programClient().getCart(token, id) : EMPTY };
  } catch (error) {
    return failed(error, "load");
  }
}

/** Sets a variant's quantity (0 removes it); `add` adds to what is already there. */
export async function setCartItem(
  variantId: unknown,
  quantity: unknown,
  add = false,
): Promise<CartResult> {
  const id = objectIdSchema.safeParse(variantId);
  if (!id.success || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 0) {
    return { status: "error", reason: "unavailable" };
  }
  try {
    const rid = await requestId();
    const token = await ensureCartToken();
    let target = quantity;
    if (add) {
      const current = await programClient().getCart(token, rid);
      const line = current.lines.find((l) => l.variantId === id.data);
      target = (line?.quantity ?? 0) + quantity;
    }
    const cart = await programClient().setCartItem(
      token,
      id.data,
      Math.min(target, CART_LIMITS.perLine),
      rid,
    );
    return { status: "ok", cart };
  } catch (error) {
    return failed(error, "set");
  }
}
