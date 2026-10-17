"use server";

import { objectIdSchema } from "@lavieco/shared";
import {
  eventCreateRequestSchema,
  eventFormUpdateRequestSchema,
  eventRevisionRequestSchema,
  eventStatusChangeRequestSchema,
  eventUpdateRequestSchema,
} from "@lavieco/shared/events";

import { fieldErrorsOf } from "../schemas";
import { callProgram } from "../server/call";
import type { ActionResult } from "../types";

const invalid = { status: "error", reason: "invalid" } as const;

export async function createEvent(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = eventCreateRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid", fieldErrors: fieldErrorsOf(parsed.error) };
  return callProgram("events.create", async (client, token, requestId) => {
    const event = await client.createEvent(token, parsed.data, requestId);
    return { id: event.id };
  });
}

export async function updateEvent(id: unknown, input: unknown): Promise<ActionResult> {
  const eventId = objectIdSchema.safeParse(id);
  if (!eventId.success) return invalid;
  const parsed = eventUpdateRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid", fieldErrors: fieldErrorsOf(parsed.error) };
  return callProgram("events.update", async (client, token, requestId) => {
    await client.updateEvent(token, eventId.data, parsed.data, requestId);
    return undefined;
  });
}

export async function updateEventForm(id: unknown, input: unknown): Promise<ActionResult> {
  const eventId = objectIdSchema.safeParse(id);
  if (!eventId.success) return invalid;
  const parsed = eventFormUpdateRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid", fieldErrors: fieldErrorsOf(parsed.error) };
  return callProgram("events.update_form", async (client, token, requestId) => {
    await client.updateEventForm(token, eventId.data, parsed.data, requestId);
    return undefined;
  });
}

export async function changeEventStatus(id: unknown, input: unknown): Promise<ActionResult> {
  const eventId = objectIdSchema.safeParse(id);
  const parsed = eventStatusChangeRequestSchema.safeParse(input);
  if (!eventId.success || !parsed.success) return invalid;
  return callProgram("events.change_status", async (client, token, requestId) => {
    await client.changeEventStatus(token, eventId.data, parsed.data, requestId);
    return undefined;
  });
}

export async function duplicateEvent(id: unknown): Promise<ActionResult<{ id: string }>> {
  const eventId = objectIdSchema.safeParse(id);
  if (!eventId.success) return invalid;
  return callProgram("events.duplicate", async (client, token, requestId) => {
    const copy = await client.duplicateEvent(token, eventId.data, requestId);
    return { id: copy.id };
  });
}

export async function discardEvent(id: unknown, input: unknown): Promise<ActionResult> {
  const eventId = objectIdSchema.safeParse(id);
  const parsed = eventRevisionRequestSchema.safeParse(input);
  if (!eventId.success || !parsed.success) return invalid;
  return callProgram("events.discard", async (client, token, requestId) => {
    await client.discardEvent(token, eventId.data, parsed.data.revision, requestId);
    return undefined;
  });
}
