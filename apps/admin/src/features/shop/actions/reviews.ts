"use server";

import { objectIdSchema } from "@lavieco/shared";
import type { ReviewAdmin } from "@lavieco/shared/shop";

import { programClient } from "@/lib/services";

import { callShop } from "../server/shop";
import type { ShopActionResult } from "../types";

/** Publish or hide a review (BR-24, `order:fulfill`). */
export async function moderateReview(
  reviewId: unknown,
  status: unknown,
): Promise<ShopActionResult<ReviewAdmin>> {
  const id = objectIdSchema.safeParse(reviewId);
  if (!id.success || (status !== "published" && status !== "hidden")) {
    return { status: "error", reason: "invalid" };
  }
  return callShop("shop.review.moderate", (token, rid) =>
    programClient().moderateReview(token, id.data, status, rid),
  );
}
