import "server-only";

import { isServiceProblem } from "@lavieco/api-clients";

import { requestId } from "@/lib/request-meta";
import { programClient, webLogger } from "@/lib/services";

/** payOS refuses bodies above a few kB; anything larger is not a webhook. */
const MAX_BODY_BYTES = 16 * 1024;

/**
 * payOS webhook (ADR-0015): the raw body goes to program-service untouched, which
 * checks the signature with the checksum key that `web` never holds. Answers with the
 * HTTP status payOS should see: 2xx stops its retries, 400 for a bad signature.
 */
export async function forwardPayosWebhook(rawBody: string): Promise<number> {
  if (rawBody.length === 0 || rawBody.length > MAX_BODY_BYTES) return 400;
  try {
    await programClient().forwardPayosWebhook(rawBody, await requestId());
    return 200;
  } catch (error) {
    if (isServiceProblem(error) && error.status >= 400 && error.status < 500) return 400;
    webLogger().warn("payos webhook not delivered", {
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    // payOS retries on anything but 2xx: a temporary failure must not be acknowledged.
    return 503;
  }
}
