import { NextResponse } from "next/server";

import { applyUnsubscribe } from "@/features/unsubscribe";

/**
 * One-click unsubscribe (RFC 8058): mail apps POST here from their own button, with no
 * cookies and no page. The signed token is the only proof needed.
 */
export async function POST(_request: Request, ctx: RouteContext<"/api/huy-nhan/[token]">) {
  const { token } = await ctx.params;
  const status = await applyUnsubscribe(token);
  if (status === "invalid") return NextResponse.json({ status }, { status: 404 });
  if (status === "unavailable") return NextResponse.json({ status }, { status: 503 });
  return NextResponse.json({ status });
}
