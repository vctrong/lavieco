import "server-only";

import { NextResponse } from "next/server";

import { isServiceProblem } from "@lavieco/api-clients";
import { handbookSearchQuerySchema } from "@lavieco/shared/content";

import { contentClient, webLogger } from "@/lib/services";

/**
 * `GET /api/cam-nang/tim?q=` (BFF): search inside the published handbook. The query is
 * validated here and again by content-service; results are public, so a short shared
 * cache is fine. The query itself is never logged.
 */
export async function handleHandbookSearch(request: Request): Promise<Response> {
  const parsed = handbookSearchQuerySchema.safeParse({
    q: new URL(request.url).searchParams.get("q") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 400 });
  }
  try {
    const result = await contentClient().searchHandbook(parsed.data.q);
    return NextResponse.json(
      { status: "ok", ...result },
      { headers: { "cache-control": "public, max-age=60, s-maxage=300" } },
    );
  } catch (error) {
    webLogger().warn("handbook search failed", {
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    return NextResponse.json(
      { status: "error" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
