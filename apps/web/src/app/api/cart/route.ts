import { readCartToken } from "@/lib/cart-cookie";
import { programClient } from "@/lib/services";

/** `GET /api/cart`: number of items, for the navbar badge (static pages stay static). */
export async function GET() {
  const token = await readCartToken();
  let count = 0;
  if (token) {
    try {
      count = (await programClient().getCart(token)).count;
    } catch {
      count = 0;
    }
  }
  return Response.json({ count }, { headers: { "cache-control": "no-store" } });
}
