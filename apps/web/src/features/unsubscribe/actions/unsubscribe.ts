"use server";

import { applyUnsubscribe } from "../server/unsubscribe";

export async function unsubscribe(token: unknown) {
  return { status: await applyUnsubscribe(typeof token === "string" ? token : "") };
}
