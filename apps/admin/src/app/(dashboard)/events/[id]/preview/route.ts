import { previewRedirect } from "@/features/events";

export async function GET(_request: Request, ctx: RouteContext<"/events/[id]/preview">) {
  const { id } = await ctx.params;
  return previewRedirect(id);
}
