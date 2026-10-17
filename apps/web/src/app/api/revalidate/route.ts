import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { REVALIDATE_HEADERS, revalidateRequestSchema } from "@lavieco/shared";

import { serverEnv } from "@/lib/env";
import { verifyRevalidateSignature } from "@/lib/revalidate";
import { webLogger } from "@/lib/services";

/**
 * Cache revalidation webhook (CLAUDE §8), called by services through their outbox.
 * HMAC-signed; only tags are accepted, never paths. Stale-while-revalidate ("max").
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const valid = verifyRevalidateSignature({
    secret: serverEnv().REVALIDATE_SECRET,
    timestamp: request.headers.get(REVALIDATE_HEADERS.timestamp),
    signature: request.headers.get(REVALIDATE_HEADERS.signature),
    rawBody,
  });
  if (!valid) {
    webLogger().warn("revalidate refused", { reason: "signature" });
    return new NextResponse(null, { status: 401 });
  }
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = revalidateRequestSchema.safeParse(json);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  for (const tag of parsed.data.tags) revalidateTag(tag, "max");
  return new NextResponse(null, { status: 204 });
}
