"use server";

import { z } from "zod";

import { objectIdSchema } from "@lavieco/shared";
import {
  EVENT_LIMITS,
  eventAttendanceApproveRequestSchema,
  eventCreateRequestSchema,
  type EventCancelImpact,
  eventFormUpdateRequestSchema,
  eventRevisionRequestSchema,
  eventStatusChangeRequestSchema,
  eventUpdateRequestSchema,
} from "@lavieco/shared/events";

import { TEXT } from "../constants/text";
import { fieldErrorsOf } from "../schemas";
import { callProgram, callProgramWithStepUp } from "../server/call";
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

/** Orders and tickets a cancellation would touch, for the confirmation step. */
export async function getCancelImpact(id: unknown): Promise<ActionResult<EventCancelImpact>> {
  const eventId = objectIdSchema.safeParse(id);
  if (!eventId.success) return invalid;
  return callProgram("events.cancel_impact", (client, token, requestId) =>
    client.getEventCancelImpact(token, eventId.data, requestId),
  );
}

const v = TEXT.vi.validation;
const cancelSchema = z.object({
  revision: z.number().int().min(1),
  reason: z
    .string()
    .trim()
    .min(EVENT_LIMITS.cancelReasonMin, v.reasonTooShort)
    .max(EVENT_LIMITS.cancelReasonMax),
  code: z
    .string()
    .trim()
    .regex(/^d{6}$/, v.code),
});

/**
 * "Huỷ chương trình": final, so it needs a fresh TOTP code (step-up, ADR-0021). The
 * service voids tickets, cancels pending orders, flags paid ones and emails buyers.
 */
export async function cancelEvent(id: unknown, input: unknown): Promise<ActionResult> {
  const eventId = objectIdSchema.safeParse(id);
  if (!eventId.success) return invalid;
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "invalid", fieldErrors };
  }
  const { revision, reason, code } = parsed.data;
  return callProgramWithStepUp("events.cancel", code, async (client, token, stepUp, requestId) => {
    await client.cancelEvent(token, eventId.data, { revision, reason }, stepUp, requestId);
    return undefined;
  });
}

/** BR-09: publishes the typed attendance of an archive-only event (impact:approve). */
export async function approveAttendance(id: unknown, input: unknown): Promise<ActionResult> {
  const eventId = objectIdSchema.safeParse(id);
  const parsed = eventAttendanceApproveRequestSchema.safeParse(input);
  if (!eventId.success || !parsed.success) return invalid;
  return callProgram("events.approve_attendance", async (client, token, requestId) => {
    await client.approveEventAttendance(token, eventId.data, parsed.data, requestId);
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
