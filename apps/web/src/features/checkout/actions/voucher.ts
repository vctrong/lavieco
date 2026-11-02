"use server";

import { z } from "zod";

import { isServiceProblem } from "@lavieco/api-clients";
import { voucherCodeSchema, type VoucherCheckResponse } from "@lavieco/shared/events";

import { clientIp, requestId } from "@/lib/request-meta";
import { identityClient, programClient } from "@/lib/services";
import { readMemberSession } from "@/lib/session";

export type VoucherCheckFailure = "invalid" | "too_low" | "rate_limited" | "unavailable";

export type VoucherCheckResult =
  { status: "ok"; data: VoucherCheckResponse } | { status: "error"; reason: VoucherCheckFailure };

const inputSchema = z.object({
  eventSlug: z.string().min(1).max(80),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().regex(/^[0-9a-f]{24}$/),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(10),
  code: voucherCodeSchema,
  email: z.email().max(254).optional(),
});

/** The signed-in member, for "thành viên" codes; a guest is simply not one. */
async function memberId(id: string): Promise<string | undefined> {
  const { accessToken } = await readMemberSession();
  if (!accessToken) return undefined;
  try {
    return (await identityClient().getMemberProfile(accessToken, id)).id;
  } catch {
    return undefined;
  }
}

/** "Áp dụng": shows the discount. The order checks it again once the email is proven. */
export async function checkVoucher(input: unknown): Promise<VoucherCheckResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const id = await requestId();
  try {
    const data = await programClient().checkVoucher(
      {
        ...parsed.data,
        userId: await memberId(id),
        clientIp: await clientIp(),
      },
      id,
    );
    return { status: "ok", data };
  } catch (error) {
    if (isServiceProblem(error)) {
      if (error.code === "common.rate_limited") return { status: "error", reason: "rate_limited" };
      if (error.code === "voucher.amount_too_low") return { status: "error", reason: "too_low" };
      if (error.status < 500) return { status: "error", reason: "invalid" };
    }
    return { status: "error", reason: "unavailable" };
  }
}
