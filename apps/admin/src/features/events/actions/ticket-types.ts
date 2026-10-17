"use server";

import { objectIdSchema } from "@lavieco/shared";
import {
  ticketTypeCreateRequestSchema,
  ticketTypeUpdateRequestSchema,
} from "@lavieco/shared/events";

import { fieldErrorsOf } from "../schemas";
import { callProgram } from "../server/call";
import type { ActionResult } from "../types";

export async function createTicketType(eventId: unknown, input: unknown): Promise<ActionResult> {
  const id = objectIdSchema.safeParse(eventId);
  if (!id.success) return { status: "error", reason: "invalid" };
  const parsed = ticketTypeCreateRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid", fieldErrors: fieldErrorsOf(parsed.error) };
  return callProgram("ticket_types.create", async (client, token, requestId) => {
    await client.createTicketType(token, id.data, parsed.data, requestId);
    return undefined;
  });
}

export async function updateTicketType(
  eventId: unknown,
  ticketTypeId: unknown,
  input: unknown,
): Promise<ActionResult> {
  const id = objectIdSchema.safeParse(eventId);
  const ticketId = objectIdSchema.safeParse(ticketTypeId);
  if (!id.success || !ticketId.success) return { status: "error", reason: "invalid" };
  const parsed = ticketTypeUpdateRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid", fieldErrors: fieldErrorsOf(parsed.error) };
  return callProgram("ticket_types.update", async (client, token, requestId) => {
    await client.updateTicketType(token, id.data, ticketId.data, parsed.data, requestId);
    return undefined;
  });
}
