import { NextResponse } from "next/server";

import { forwardPayosWebhook } from "@/features/checkout";

/** payOS payment webhook, registered with `npm run payos:webhook -- <url>` (ADR-0015). */
export async function POST(request: Request) {
  const status = await forwardPayosWebhook(await request.text());
  return NextResponse.json({ success: status === 200 }, { status });
}
