import { NextResponse } from "next/server";
import { z } from "zod";

import { exportRegistrations } from "@/features/ticketing";

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  includeRefunded: z.boolean().default(false),
});

/**
 * Excel export of the registrations (ADR-0017): POST with a fresh TOTP code (step-up,
 * ADR-0021). The staff cookie is SameSite=Strict and the service checks
 * `registration:export`, the step-up token and records the audit event.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/events/[id]/registrations/export">,
) {
  const { id } = await ctx.params;
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!/^[0-9a-f]{24}$/.test(id) || !body.success) {
    return NextResponse.json({ reason: "invalid" }, { status: 400 });
  }
  const result = await exportRegistrations(id, body.data.code, body.data.includeRefunded);
  if (result.status !== "ok") {
    const reason = result.status === "error" ? result.reason : "invalid";
    return NextResponse.json({ reason }, { status: reason === "unavailable" ? 503 : 400 });
  }
  const file = result.data;
  return new NextResponse(file.body, {
    headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${file.fileName ?? "LAVIECO.xlsx"}"`,
      "cache-control": "no-store",
    },
  });
}
