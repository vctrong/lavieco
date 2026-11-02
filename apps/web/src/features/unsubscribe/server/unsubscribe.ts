import "server-only";

import { isServiceProblem } from "@lavieco/api-clients";
import { unsubscribeTokenSchema } from "@lavieco/shared/events";

import { requestId } from "@/lib/request-meta";
import { programClient } from "@/lib/services";

/** Whether the link is ours. Opening a page changes nothing: mail scanners open links. */
export async function isValidUnsubscribe(token: string): Promise<boolean> {
  if (!unsubscribeTokenSchema.safeParse(token).success) return false;
  try {
    return (await programClient().checkUnsubscribe(token, await requestId())).valid;
  } catch (error) {
    if (isServiceProblem(error) && error.status < 500) return false;
    throw error;
  }
}

/** Shared by the button and by mail apps' one-click POST (RFC 8058). */
export async function applyUnsubscribe(token: string): Promise<"ok" | "invalid" | "unavailable"> {
  if (!unsubscribeTokenSchema.safeParse(token).success) return "invalid";
  try {
    await programClient().unsubscribe({ token }, await requestId());
    return "ok";
  } catch (error) {
    return isServiceProblem(error) && error.status < 500 ? "invalid" : "unavailable";
  }
}
