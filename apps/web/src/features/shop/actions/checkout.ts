"use server";

import { randomBytes } from "node:crypto";

import { isServiceProblem } from "@lavieco/api-clients";
import { normalizeEmail } from "@lavieco/shared";
import type { ShopOrderPublic, ShopQuote } from "@lavieco/shared/shop";

import { readCartToken } from "@/lib/cart-cookie";
import { withMemberToken } from "@/lib/member-token";
import { clientIp, requestId } from "@/lib/request-meta";
import { identityClient, programClient, webLogger } from "@/lib/services";
import { verifyTurnstile } from "@/lib/turnstile";

import {
  challengeIdSchema,
  orderLinkSchema,
  otpCodeSchema,
  shopCheckoutFormSchema,
  type ShopCheckoutForm,
} from "../schemas";

/** Version of the consent sentence shown at checkout (`TEXT.vi.checkout.consent`). */
const CONSENT_VERSION = "shop-2026-11";

export type CheckoutFailure =
  | "invalid"
  | "bot"
  | "cart_empty"
  | "cart_changed"
  | "out_of_stock"
  | "cod_not_allowed"
  | "too_many_pending"
  | "voucher_invalid"
  | "amount_too_low"
  | "payment_unavailable"
  | "code_invalid"
  | "code_expired"
  | "rate_limited"
  | "unavailable";

export type CheckoutResult<T> =
  { status: "ok"; data: T } | { status: "error"; reason: CheckoutFailure; ref?: string };

const CODE_TO_REASON: Record<string, CheckoutFailure> = {
  "shop_order.cart_empty": "cart_empty",
  "shop_order.cart_changed": "cart_changed",
  "shop_order.out_of_stock": "out_of_stock",
  "shop_order.cod_not_allowed": "cod_not_allowed",
  "shop_order.too_many_pending": "too_many_pending",
  "voucher.invalid": "voucher_invalid",
  "voucher.amount_too_low": "amount_too_low",
  "payment.unavailable": "payment_unavailable",
  "otp.invalid": "code_invalid",
  "otp.code_invalid": "code_invalid",
  "otp.expired": "code_expired",
  "common.rate_limited": "rate_limited",
  "common.validation_failed": "invalid",
};

function failed(error: unknown, context: string, id: string): CheckoutResult<never> {
  if (isServiceProblem(error)) {
    const reason =
      CODE_TO_REASON[error.code] ?? (error.code.startsWith("otp.") ? "code_invalid" : undefined);
    if (reason) return { status: "error", reason };
  }
  webLogger().warn("shop checkout failed", {
    context,
    requestId: id,
    errorCode: isServiceProblem(error) ? error.code : "unavailable",
  });
  return {
    status: "error",
    reason: "unavailable",
    ref: id.replace(/-/g, "").slice(0, 8).toUpperCase(),
  };
}

/** Price of the cart for the chosen delivery and code (nothing is held). */
export async function quoteCheckout(input: {
  method: unknown;
  voucherCode: unknown;
  email: unknown;
}): Promise<CheckoutResult<ShopQuote>> {
  const id = await requestId();
  const token = await readCartToken();
  if (!token) return { status: "error", reason: "cart_empty" };
  try {
    const quote = await programClient().quoteShopOrder(
      {
        cartToken: token,
        shippingMethod: input.method === "pickup" ? "pickup" : "delivery",
        voucherCode:
          typeof input.voucherCode === "string" && input.voucherCode.trim()
            ? input.voucherCode.trim().toUpperCase()
            : undefined,
        email:
          typeof input.email === "string" && /^\S+@\S+\.\S+$/.test(input.email)
            ? input.email
            : undefined,
      },
      id,
    );
    return { status: "ok", data: quote };
  } catch (error) {
    return failed(error, "shop.quote", id);
  }
}

async function memberProof(email: string, id: string): Promise<string | null> {
  try {
    const call = await withMemberToken(id, async (accessToken) => {
      const profile = await identityClient().getMemberProfile(accessToken, id);
      if (!profile.emailVerifiedAt || normalizeEmail(profile.email) !== normalizeEmail(email))
        return null;
      return (await identityClient().memberEmailProof(accessToken, id)).verificationToken;
    });
    return call.session === "ok" ? call.value : null;
  } catch {
    return null;
  }
}

async function place(form: ShopCheckoutForm, verificationToken: string, id: string) {
  const token = await readCartToken();
  if (!token) return { status: "error", reason: "cart_empty" } as const;
  try {
    const created = await programClient().createShopOrder(
      {
        cartToken: token,
        verificationToken,
        buyer: { fullName: form.fullName, email: form.email, phone: form.phone },
        shipping: {
          method: form.method,
          recipientName: form.sameRecipient ? form.fullName : form.recipientName,
          recipientPhone: form.sameRecipient ? form.phone : form.recipientPhone,
          address:
            form.method === "delivery"
              ? { line: form.line, ward: form.ward, province: form.province }
              : null,
          note: form.note,
        },
        paymentMethod: form.paymentMethod,
        ...(form.voucherCode ? { voucherCode: form.voucherCode.toUpperCase() } : {}),
        dataConsent: true,
        consentVersion: CONSENT_VERSION,
      },
      id,
    );
    const pay = created.order.status === "awaiting_payment" && created.order.payment;
    return {
      status: "ok",
      data: {
        kind: "placed" as const,
        redirectTo: pay
          ? `/thanh-toan/${created.accessToken}`
          : `/don-hang/${created.accessToken}?moi=1`,
      },
    } as const;
  } catch (error) {
    return failed(error, "shop.place", id);
  }
}

type Started =
  | { kind: "code"; challengeId: string; resendAvailableAt: string }
  | { kind: "placed"; redirectTo: string };

/**
 * Step 1: checks the form and the anti-bot fields, then either places the order (a member
 * buying with their own verified email) or emails a 6-digit code (BR-12). Stock is only
 * held once the email is proven (BR-22).
 */
export async function startShopCheckout(input: unknown): Promise<CheckoutResult<Started>> {
  const id = await requestId();
  const parsed = shopCheckoutFormSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  if (parsed.data.website) {
    return {
      status: "ok",
      data: {
        kind: "code",
        challengeId: randomBytes(16).toString("base64url"),
        resendAvailableAt: new Date(Date.now() + 45_000).toISOString(),
      },
    };
  }
  if (!(await verifyTurnstile(parsed.data.turnstileToken, await clientIp())))
    return { status: "error", reason: "bot" };
  const proof = await memberProof(parsed.data.email, id);
  if (proof) return place(parsed.data, proof, id);
  try {
    const sent = await identityClient().createOtpChallenge(
      { email: parsed.data.email, purpose: "checkout", clientIp: await clientIp() },
      id,
    );
    return {
      status: "ok",
      data: {
        kind: "code",
        challengeId: sent.challengeId,
        resendAvailableAt: sent.resendAvailableAt,
      },
    };
  } catch (error) {
    return failed(error, "shop.code", id);
  }
}

/** Step 2: the code, then the order (stock held, payOS link or COD). */
export async function confirmShopCheckout(input: {
  form: unknown;
  challengeId: unknown;
  code: unknown;
}): Promise<CheckoutResult<{ kind: "placed"; redirectTo: string }>> {
  const id = await requestId();
  const form = shopCheckoutFormSchema.safeParse(input.form);
  const challengeId = challengeIdSchema.safeParse(input.challengeId);
  const code = otpCodeSchema.safeParse(input.code);
  if (!form.success) return { status: "error", reason: "invalid" };
  if (!challengeId.success || !code.success) return { status: "error", reason: "code_invalid" };
  let verificationToken: string;
  try {
    verificationToken = (
      await identityClient().verifyOtpChallenge(
        { challengeId: challengeId.data, code: code.data },
        id,
      )
    ).verificationToken;
  } catch (error) {
    return failed(error, "shop.verify", id);
  }
  return place(form.data, verificationToken, id);
}

/** Payment page and order page: the latest state (asks payOS when still unpaid). */
export async function refreshShopOrder(token: unknown): Promise<CheckoutResult<ShopOrderPublic>> {
  const id = await requestId();
  const link = orderLinkSchema.safeParse(token);
  if (!link.success) return { status: "error", reason: "invalid" };
  try {
    return { status: "ok", data: await programClient().getShopOrderByLink(link.data, id) };
  } catch (error) {
    return failed(error, "shop.refresh", id);
  }
}

export async function cancelShopOrder(token: unknown): Promise<CheckoutResult<ShopOrderPublic>> {
  const id = await requestId();
  const link = orderLinkSchema.safeParse(token);
  if (!link.success) return { status: "error", reason: "invalid" };
  try {
    return { status: "ok", data: await programClient().cancelShopOrderByLink(link.data, id) };
  } catch (error) {
    return failed(error, "shop.cancel", id);
  }
}

/** `/tra-cuu-don`: code to the email, then the orders of that email. */
export async function startOrderLookup(
  email: unknown,
): Promise<CheckoutResult<{ challengeId: string }>> {
  const id = await requestId();
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    return { status: "error", reason: "invalid" };
  }
  try {
    const sent = await identityClient().createOtpChallenge(
      { email, purpose: "ticket_lookup", clientIp: await clientIp() },
      id,
    );
    return { status: "ok", data: { challengeId: sent.challengeId } };
  } catch (error) {
    return failed(error, "shop.lookup_code", id);
  }
}

export async function confirmOrderLookup(input: { challengeId: unknown; code: unknown }) {
  const id = await requestId();
  const challengeId = challengeIdSchema.safeParse(input.challengeId);
  const code = otpCodeSchema.safeParse(input.code);
  if (!challengeId.success || !code.success)
    return { status: "error", reason: "code_invalid" } as const;
  try {
    const { verificationToken } = await identityClient().verifyOtpChallenge(
      { challengeId: challengeId.data, code: code.data },
      id,
    );
    const found = await programClient().lookupShopOrders(verificationToken, id);
    return { status: "ok", data: found.items } as const;
  } catch (error) {
    return failed(error, "shop.lookup", id);
  }
}
