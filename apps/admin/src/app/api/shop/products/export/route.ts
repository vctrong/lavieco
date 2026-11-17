import { handleShopDownload } from "@/features/shop";

export function GET() {
  return handleShopDownload("export");
}
