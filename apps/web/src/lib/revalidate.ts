import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { REVALIDATE_TOLERANCE_SECONDS } from "@lavieco/shared";

/**
 * Checks the HMAC-SHA256 signature of a `/api/revalidate` call: hex digest of
 * `<timestamp>.<raw body>` with the shared secret, timestamp within ±5 minutes.
 * An empty secret refuses everything.
 */
export function verifyRevalidateSignature(input: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  rawBody: string;
  nowSeconds?: number;
}): boolean {
  const { secret, timestamp, signature, rawBody } = input;
  const key = Buffer.from(secret, "base64");
  if (key.length < 32 || !timestamp || !signature) return false;
  if (!/^\d{1,12}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > REVALIDATE_TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", key).update(`${timestamp}.${rawBody}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
