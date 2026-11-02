"use server";

import type { z } from "zod";

import { objectIdSchema } from "@lavieco/shared";
import {
  voucherCreateRequestSchema,
  voucherStatusRequestSchema,
  voucherUpdateRequestSchema,
  type VoucherView,
} from "@lavieco/shared/events";

import { programClient } from "@/lib/services";

import { TEXT } from "../constants/text";
import { callVouchers } from "../server/vouchers";
import type { VoucherActionResult } from "../types";

function fieldErrors(error: z.ZodError): VoucherActionResult<never> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    // Never the schema's English text: one sentence in Vietnamese per field.
    errors[key] ??= TEXT.vi.errors.invalid;
  }
  return { status: "invalid", fieldErrors: errors };
}

export async function createVoucher(input: unknown): Promise<VoucherActionResult<VoucherView>> {
  const parsed = voucherCreateRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callVouchers("vouchers.create", (token, id) =>
    programClient().createVoucher(token, parsed.data, id),
  );
}

export async function updateVoucher(
  voucherId: unknown,
  input: unknown,
): Promise<VoucherActionResult<VoucherView>> {
  const id = objectIdSchema.safeParse(voucherId);
  if (!id.success) return { status: "error", reason: "not_found" };
  const parsed = voucherUpdateRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callVouchers("vouchers.update", (token, requestId) =>
    programClient().updateVoucher(token, id.data, parsed.data, requestId),
  );
}

export async function setVoucherStatus(
  voucherId: unknown,
  input: unknown,
): Promise<VoucherActionResult<VoucherView>> {
  const id = objectIdSchema.safeParse(voucherId);
  if (!id.success) return { status: "error", reason: "not_found" };
  const parsed = voucherStatusRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callVouchers("vouchers.status", (token, requestId) =>
    programClient().setVoucherStatus(token, id.data, parsed.data, requestId),
  );
}

export async function duplicateVoucher(
  voucherId: unknown,
): Promise<VoucherActionResult<VoucherView>> {
  const id = objectIdSchema.safeParse(voucherId);
  if (!id.success) return { status: "error", reason: "not_found" };
  return callVouchers("vouchers.duplicate", (token, requestId) =>
    programClient().duplicateVoucher(token, id.data, requestId),
  );
}
