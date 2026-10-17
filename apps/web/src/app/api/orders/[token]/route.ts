import { NextResponse } from "next/server";

import { getOrderStatus } from "@/features/checkout";

/** Payment page polling (every 3 s): the order behind a signed link, never cached. */
export async function GET(_request: Request, ctx: RouteContext<"/api/orders/[token]">) {
  const { token } = await ctx.params;
  const order = await getOrderStatus(token).catch(() => undefined);
  const headers = { "cache-control": "no-store", "x-robots-tag": "noindex" };
  if (order === undefined) return NextResponse.json({}, { status: 503, headers });
  if (order === null) return NextResponse.json({}, { status: 404, headers });
  return NextResponse.json(order, { headers });
}
