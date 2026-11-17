import "server-only";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { isServiceProblem, type DownloadedFile } from "@lavieco/api-clients";
import type { ShopOrderListQuery } from "@lavieco/shared/shop";

import { requestId } from "@/lib/request-meta";
import { adminLogger, identityClient, programClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";
import { withStaffToken } from "@/lib/staff-token";

async function read<T>(path: string, run: (token: string, id: string) => Promise<T>): Promise<T> {
  const { accessToken, refreshToken } = await readStaffSession();
  const refresh = `/api/auth/refresh?next=${encodeURIComponent(path)}`;
  if (!accessToken) redirect(refreshToken ? refresh : "/login");
  try {
    return await run(accessToken, await requestId());
  } catch (error) {
    if (isServiceProblem(error) && error.status === 401)
      redirect(refreshToken ? refresh : "/login");
    if (isServiceProblem(error) && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }
}

export const loadShopOrders = (query: Partial<ShopOrderListQuery>) =>
  read("/shop/orders", (token, id) =>
    programClient().listShopOrders(token, { limit: 20, ...query }, id),
  );

export function loadShopOrder(orderId: string) {
  if (!/^[0-9a-f]{24}$/.test(orderId)) notFound();
  return read(`/shop/orders/${orderId}`, (token, id) =>
    programClient().getShopOrder(token, orderId, id),
  );
}

/** Null when the staff member may not read orders (the overview then shows catalogue links only). */
export async function loadShopOverview() {
  try {
    return await read("/shop", (token, id) => programClient().getShopOverview(token, id));
  } catch {
    return null;
  }
}

const exportBodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  from: z.iso.date(),
  to: z.iso.date(),
});

/**
 * `POST /api/shop/orders/export`: TOTP code (step-up, ADR-0021) and a date range (days
 * in Vietnam time). program-service checks `order:export` and audits the export.
 */
export async function handleShopOrdersExport(request: Request): Promise<Response> {
  const body = exportBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ reason: "invalid" }, { status: 400 });
  const id = await requestId();
  const from = new Date(`${body.data.from}T00:00:00+07:00`).toISOString();
  const to = new Date(`${body.data.to}T23:59:59+07:00`).toISOString();
  try {
    const call = await withStaffToken<DownloadedFile>(id, async (token) => {
      const { stepUpToken } = await identityClient().stepUp(token, body.data.code, id);
      return programClient().exportShopOrders(token, { from, to }, stepUpToken, id);
    });
    if (call.session === "expired")
      return Response.json({ reason: "session_expired" }, { status: 401 });
    const file = call.value;
    return new Response(file.body, {
      headers: {
        "content-type": file.contentType,
        "content-disposition": `attachment; filename="${file.fileName ?? "LAVIECO_don-hang.xlsx"}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const code = isServiceProblem(error) ? error.code : "unavailable";
    adminLogger().warn("shop order export failed", { requestId: id, errorCode: code });
    const reason = code.startsWith("auth.")
      ? "code_invalid"
      : code === "common.forbidden"
        ? "forbidden"
        : "unavailable";
    return Response.json({ reason }, { status: reason === "unavailable" ? 503 : 400 });
  }
}

export const loadReviews = (status: "pending" | "published" | "hidden") =>
  read("/shop/reviews", (token, id) =>
    programClient().listReviews(token, { status, limit: 50 }, id),
  );
