/**
 * Version of the data-consent sentence of the checkout (`TEXT.vi.checkout.dataConsent`),
 * stored with each order and its time (BR-06). Bump it whenever that text changes.
 */
export const CHECKOUT_CONSENT_VERSION = "checkout-2026-10";

export const OTP_LENGTH = 6;

/** The payment page polls the order every 3 s (docs/05 §5.1). */
export const PAYMENT_POLL_MS = 3_000;

export const CHECKOUT_ROUTES = {
  event: (slug: string) => `/chuong-trinh/${slug}`,
  checkout: (slug: string) => `/chuong-trinh/${slug}/dang-ky`,
  payment: (token: string) => `/chuong-trinh/thanh-toan/${token}`,
  ticket: (token: string) => `/ve/${token}`,
  lookup: "/tra-cuu-ve",
  orderStatusApi: (token: string) => `/api/orders/${token}`,
} as const;

/** Signed order link as minted by program-service (`<orderId>.<mac>`). */
export const ORDER_TOKEN_PATTERN = /^[0-9a-f]{24}\.[A-Za-z0-9_-]{43}$/;
