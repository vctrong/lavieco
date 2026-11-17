import "server-only";

import QRCode from "qrcode";

import { isServiceProblem } from "@lavieco/api-clients";
import type { ShopOrderPublic } from "@lavieco/shared/shop";

import { withMemberToken } from "@/lib/member-token";
import { requestId } from "@/lib/request-meta";
import { identityClient, programClient } from "@/lib/services";

import { orderLinkSchema } from "../schemas";

/** The order behind a signed link (fresh, never cached), or null for a 404 page. */
export async function getShopOrder(token: string): Promise<ShopOrderPublic | null> {
  if (!orderLinkSchema.safeParse(token).success) return null;
  try {
    return await programClient().getShopOrderByLink(token, await requestId());
  } catch (error) {
    if (isServiceProblem(error) && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

/** VietQR image of the payOS payload, drawn here (the QR itself is never stored). */
export function qrImage(payload: string) {
  return QRCode.toDataURL(payload, { margin: 1, width: 560, errorCorrectionLevel: "M" });
}

/** "Đơn hàng của tôi": null when not signed in. */
export async function getMyShopOrders() {
  const id = await requestId();
  try {
    const call = await withMemberToken(id, (token) => programClient().listMyShopOrders(token, id));
    return call.session === "ok" ? call.value.items : null;
  } catch {
    return [];
  }
}

/** Name, email and phone of a signed-in member, to prefill the checkout. */
export async function getCheckoutPrefill() {
  const id = await requestId();
  try {
    const call = await withMemberToken(id, (token) => identityClient().getMemberProfile(token, id));
    if (call.session !== "ok") return null;
    const profile = call.value;
    return { fullName: profile.displayName, email: profile.email, phone: "" };
  } catch {
    return null;
  }
}

/** Lines of a delivered order to review (`/danh-gia/[token]`), or null for a 404. */
export async function getReviewableOrder(token: string) {
  if (!orderLinkSchema.safeParse(token).success) return null;
  try {
    return await programClient().getReviewableOrder(token, await requestId());
  } catch (error) {
    if (isServiceProblem(error) && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}
