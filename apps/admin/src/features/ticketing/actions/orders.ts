"use server";

import { z } from "zod";

import { ORDER_LIMITS, type OrderDetail } from "@lavieco/shared/events";

import { TEXT } from "../constants/text";
import { callStaff, stepUpToken } from "../server/call";
import type { ActionResult } from "../types";

const idSchema = z.string().regex(/^[0-9a-f]{24}$/);
const refundSchema = z.object({
  orderId: idSchema,
  revision: z.number().int().min(1),
  note: z.string().trim().min(1, TEXT.vi.errors.invalid).max(ORDER_LIMITS.refundNoteMax),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, TEXT.vi.stepUp.codeFormat),
});

/** "Kiểm tra lại thanh toán": the service asks payOS and settles like the webhook. */
export async function reconcileOrder(orderId: unknown): Promise<ActionResult<OrderDetail>> {
  const id = idSchema.safeParse(orderId);
  if (!id.success) return { status: "error", reason: "not_found" };
  return callStaff("orders.reconcile", ({ program }, token, requestId) =>
    program.reconcileOrder(token, id.data, requestId),
  );
}

/** "Gửi lại vé": queues the ticket email again (paid orders only). */
export async function resendTickets(orderId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(orderId);
  if (!id.success) return { status: "error", reason: "not_found" };
  return callStaff("orders.resend", async ({ program }, token, requestId) => {
    await program.resendTickets(token, id.data, requestId);
    return undefined;
  });
}

/**
 * "Đánh dấu đã hoàn tiền" after a manual bank transfer (BR-15): step-up with a fresh
 * TOTP code first, then the refund (tickets void, seats back, audited by the service).
 */
export async function markRefunded(input: unknown): Promise<ActionResult<OrderDetail>> {
  const parsed = refundSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "invalid", fieldErrors };
  }
  const { orderId, revision, note, code } = parsed.data;
  return callStaff("orders.refund", async ({ program, identity }, token, requestId) => {
    const stepUp = await stepUpToken(identity, token, code, requestId);
    return program.refundOrder(token, orderId, { revision, note }, stepUp, requestId);
  });
}
