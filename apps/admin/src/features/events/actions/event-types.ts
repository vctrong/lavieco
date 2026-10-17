"use server";

import { objectIdSchema } from "@lavieco/shared";
import { eventTypeCreateRequestSchema, eventTypeUpdateRequestSchema } from "@lavieco/shared/events";

import { fieldErrorsOf } from "../schemas";
import { callProgram } from "../server/call";
import type { ActionResult } from "../types";

export async function createEventType(input: unknown): Promise<ActionResult> {
  const parsed = eventTypeCreateRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid", fieldErrors: fieldErrorsOf(parsed.error) };
  return callProgram("event_types.create", async (client, token, requestId) => {
    await client.createEventType(token, parsed.data, requestId);
    return undefined;
  });
}

export async function updateEventType(id: unknown, input: unknown): Promise<ActionResult> {
  const typeId = objectIdSchema.safeParse(id);
  if (!typeId.success) return { status: "error", reason: "invalid" };
  const parsed = eventTypeUpdateRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid", fieldErrors: fieldErrorsOf(parsed.error) };
  return callProgram("event_types.update", async (client, token, requestId) => {
    await client.updateEventType(token, typeId.data, parsed.data, requestId);
    return undefined;
  });
}
