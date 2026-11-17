import type { Metadata } from "next";

import { REVIEW_STATUSES, type ReviewStatus } from "@lavieco/shared/shop";

import { ReviewsPage, SHOP_TEXT, loadReviews } from "@/features/shop";

export const metadata: Metadata = { title: SHOP_TEXT.vi.reviews.meta };

export default async function ReviewsRoute({ searchParams }: PageProps<"/shop/reviews">) {
  const value = (await searchParams).status;
  const status: ReviewStatus = (REVIEW_STATUSES as readonly unknown[]).includes(value)
    ? (value as ReviewStatus)
    : "pending";
  return <ReviewsPage page={await loadReviews(status)} status={status} />;
}
