import { createHmac } from "node:crypto";

import { REVALIDATE_HEADERS, type RevalidateRequest } from "@lavieco/shared";

export type WebRevalidatorOptions = {
  webAppUrl: string;
  /** base64 secret shared with `web` (`REVALIDATE_SECRET`). */
  secret: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export class WebRevalidationError extends Error {
  override name = "WebRevalidationError";
}

/**
 * Calls `POST <web>/api/revalidate` with an HMAC-SHA256 signature over
 * `<timestamp>.<body>`. Throws on any non-2xx so the outbox retries with backoff.
 */
export function createWebRevalidator({
  webAppUrl,
  secret,
  fetchImpl = fetch,
  timeoutMs = 5_000,
}: WebRevalidatorOptions) {
  const key = Buffer.from(secret, "base64");
  const url = new URL("/api/revalidate", webAppUrl).toString();

  return async function revalidate(body: RevalidateRequest, now = new Date()): Promise<void> {
    const raw = JSON.stringify(body);
    const timestamp = String(Math.floor(now.getTime() / 1000));
    const signature = createHmac("sha256", key).update(`${timestamp}.${raw}`).digest("hex");
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [REVALIDATE_HEADERS.timestamp]: timestamp,
        [REVALIDATE_HEADERS.signature]: signature,
      },
      body: raw,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new WebRevalidationError(`status ${response.status}`);
  };
}
