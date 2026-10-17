"use server";

import { checkinRequestSchema, type CheckinResponse } from "@lavieco/shared/events";

import { callStaff } from "../server/call";
import type { ActionResult } from "../types";

/** One scan or typed code at the door (`checkin:perform`, checked by the service). */
export async function checkIn(input: unknown): Promise<ActionResult<CheckinResponse>> {
  const parsed = checkinRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid", fieldErrors: { code: "invalid" } };
  return callStaff("checkin.scan", ({ program }, token, requestId) =>
    program.checkIn(token, parsed.data, requestId),
  );
}
