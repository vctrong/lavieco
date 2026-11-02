import { NextResponse } from "next/server";
import { z } from "zod";

import { exportSurvey } from "@/features/surveys";

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  format: z.enum(["xlsx", "csv"]).default("xlsx"),
});

/**
 * Survey export: POST with a fresh TOTP code (step-up, ADR-0021). program-service checks
 * `survey:read` and the step-up token, and records the audit event.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/surveys/[id]/export">) {
  const { id } = await ctx.params;
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!/^[0-9a-f]{24}$/.test(id) || !body.success) {
    return NextResponse.json({ reason: "invalid" }, { status: 400 });
  }
  const result = await exportSurvey(id, body.data.code, body.data.format);
  if (result.status !== "ok") {
    const reason = result.status === "error" ? result.reason : "invalid";
    return NextResponse.json({ reason }, { status: reason === "unavailable" ? 503 : 400 });
  }
  const file = result.data;
  return new NextResponse(file.body, {
    headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${file.fileName ?? "LAVIECO-khao-sat"}"`,
      "cache-control": "no-store",
    },
  });
}
