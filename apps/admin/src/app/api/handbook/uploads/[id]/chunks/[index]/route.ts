import { handleHandbookChunk } from "@/features/handbook";

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/handbook/uploads/[id]/chunks/[index]">,
) {
  const { id, index } = await ctx.params;
  return handleHandbookChunk(request, id, index);
}
