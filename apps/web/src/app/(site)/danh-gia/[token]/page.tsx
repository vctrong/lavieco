import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReviewPage, SHOP_TEXT, getReviewableOrder } from "@/features/shop";

export const metadata: Metadata = {
  title: SHOP_TEXT.vi.reviews.metaTitle,
  robots: { index: false },
};

export default async function ReviewRoute({ params }: PageProps<"/danh-gia/[token]">) {
  const { token } = await params;
  const order = await getReviewableOrder(token);
  if (!order) notFound();
  return <ReviewPage token={token} order={order} />;
}
