import "server-only";

import { notFound, redirect } from "next/navigation";

import { isServiceProblem } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";
import type { VoucherListQuery } from "@lavieco/shared/events";

import { failureKind, refOf } from "@/lib/action-errors";
import { requestId } from "@/lib/request-meta";
import { adminLogger, programClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";

import type { VoucherActionResult, VoucherFailure } from "../types";

async function read<T>(path: string, run: (token: string, id: string) => Promise<T>): Promise<T> {
  const { accessToken, refreshToken } = await readStaffSession();
  const refresh = `/api/auth/refresh?next=${encodeURIComponent(path)}`;
  if (!accessToken) redirect(refreshToken ? refresh : "/login");
  try {
    return await run(accessToken, await requestId());
  } catch (error) {
    if (isServiceProblem(error) && error.status === 401) {
      redirect(refreshToken ? refresh : "/login");
    }
    if (isServiceProblem(error) && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }
}

export function loadVouchers(query: Partial<VoucherListQuery>) {
  return read("/vouchers", (token, id) =>
    programClient().listVouchers(token, { limit: 20, ...query }, id),
  );
}

export function loadVoucher(voucherId: string) {
  if (!/^[0-9a-f]{24}$/.test(voucherId)) notFound();
  return read(`/vouchers/${voucherId}`, async (token, id) => {
    const [voucher, stats] = await Promise.all([
      programClient().getVoucher(token, voucherId, id),
      programClient().getVoucherStats(token, voucherId, id),
    ]);
    return { voucher, stats };
  });
}

/** Events to pick from when a voucher belongs to one. */
export function loadEventChoices() {
  return read("/vouchers/new", async (token, id) => {
    const page = await programClient().listEvents(token, { limit: 100 }, id);
    return page.items.map((event) => ({ id: event.id, title: event.title }));
  });
}

const FAILURE_BY_CODE: Partial<Record<ErrorCode, VoucherFailure>> = {
  "common.unauthenticated": "session_expired",
  "common.forbidden": "forbidden",
  "common.not_found": "not_found",
  "common.conflict": "conflict",
  "common.validation_failed": "invalid",
  "voucher.code_taken": "code_taken",
  "voucher.locked": "locked",
};

/** Runs a write with the staff token; program-service checks `voucher:write` itself. */
export async function callVouchers<T>(
  context: string,
  run: (token: string, id: string) => Promise<T>,
): Promise<VoucherActionResult<T>> {
  const id = await requestId();
  try {
    const { accessToken } = await readStaffSession();
    if (!accessToken) return { status: "error", reason: "session_expired" };
    return { status: "ok", data: await run(accessToken, id) };
  } catch (error) {
    if (isServiceProblem(error)) {
      const reason = FAILURE_BY_CODE[error.code];
      if (reason) return { status: "error", reason };
    }
    adminLogger().warn("vouchers action failed", {
      context,
      requestId: id,
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
      ...(isServiceProblem(error) ? {} : failureKind(error)),
    });
    return { status: "error", reason: "unavailable", ref: refOf(id) };
  }
}
