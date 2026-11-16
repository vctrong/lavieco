"use server";

import { headers } from "next/headers";

import {
  pushSubscriptionRequestSchema,
  pushTopicsUpdateRequestSchema,
  pushUnsubscribeRequestSchema,
  type PushSettings,
  type PushTestResponse,
} from "@lavieco/shared/identity";

import { callIdentity } from "../server/call";
import type { ActionResult } from "../types";
import { deviceLabelOf } from "../utils/device-label";

/** Registers this browser's push subscription for the signed-in staff member. */
export async function subscribePush(input: unknown): Promise<ActionResult> {
  const userAgent = (await headers()).get("user-agent") ?? "";
  const parsed = pushSubscriptionRequestSchema.safeParse({
    ...(typeof input === "object" && input !== null ? input : {}),
    deviceLabel: deviceLabelOf(userAgent),
  });
  if (!parsed.success) return { status: "invalid" };
  return callIdentity("push.subscribe", async (identity, token, id) => {
    await identity.subscribePush(token, parsed.data, id);
    return undefined;
  });
}

export async function unsubscribePush(input: unknown): Promise<ActionResult> {
  const parsed = pushUnsubscribeRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  return callIdentity("push.unsubscribe", async (identity, token, id) => {
    await identity.unsubscribePush(token, parsed.data, id);
    return undefined;
  });
}

/** Topic choice from the checkbox form (values read from FormData, docs/04 §5.5). */
export async function savePushTopics(formData: FormData): Promise<ActionResult<PushSettings>> {
  const parsed = pushTopicsUpdateRequestSchema.safeParse({ topics: formData.getAll("topics") });
  if (!parsed.success) return { status: "invalid" };
  return callIdentity("push.topics", (identity, token, id) =>
    identity.updatePushTopics(token, parsed.data, id),
  );
}

export async function sendTestPush(): Promise<ActionResult<PushTestResponse>> {
  return callIdentity("push.test", (identity, token, id) => identity.sendTestPush(token, id));
}
