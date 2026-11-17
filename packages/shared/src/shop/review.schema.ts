import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import { cursorPageQuerySchema, cursorPageSchema } from "../common/pagination";

/**
 * Product reviews (BR-24): only from a delivered order, one per order line, plain text,
 * moderated before anyone sees them, never with the email or phone.
 */
export const REVIEW_STATUSES = ["pending", "published", "hidden"] as const;
export const reviewStatusSchema = z.enum(REVIEW_STATUSES);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const REVIEW_LIMITS = { bodyMax: 1_000, nameMax: 60 } as const;

export const reviewCreateRequestSchema = z.object({
  /** The signed order link the review email points to. */
  orderToken: z.string().min(20).max(200),
  variantId: objectIdSchema,
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(3).max(REVIEW_LIMITS.bodyMax),
  displayName: z.string().trim().max(REVIEW_LIMITS.nameMax).default(""),
});
export type ReviewCreateRequest = z.infer<typeof reviewCreateRequestSchema>;

/** What a delivered order may review: its lines, and which already have a review. */
export const reviewableOrderSchema = z.object({
  publicCode: z.string(),
  canReview: z.boolean(),
  items: z.array(
    z.object({
      variantId: objectIdSchema,
      productSlug: z.string(),
      title: z.string(),
      optionLabel: z.string(),
      reviewed: z.boolean(),
    }),
  ),
});
export type ReviewableOrder = z.infer<typeof reviewableOrderSchema>;

export const publicReviewSchema = z.object({
  displayName: z.string(),
  rating: z.number().int(),
  body: z.string(),
  optionLabel: z.string(),
  createdAt: isoDateTimeSchema,
});
export type PublicReview = z.infer<typeof publicReviewSchema>;

export const productReviewsSchema = z.object({
  average: z.number(),
  count: z.number().int(),
  items: z.array(publicReviewSchema),
});
export type ProductReviews = z.infer<typeof productReviewsSchema>;

export const reviewAdminSchema = z.object({
  id: objectIdSchema,
  productSlug: z.string(),
  productTitle: z.string(),
  optionLabel: z.string(),
  orderId: objectIdSchema,
  displayName: z.string(),
  rating: z.number().int(),
  body: z.string(),
  status: reviewStatusSchema,
  createdAt: isoDateTimeSchema,
});
export type ReviewAdmin = z.infer<typeof reviewAdminSchema>;

export const reviewListQuerySchema = cursorPageQuerySchema.extend({
  status: reviewStatusSchema.default("pending"),
});
export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;
export const reviewListSchema = cursorPageSchema(reviewAdminSchema);
export type ReviewList = z.infer<typeof reviewListSchema>;

export const reviewModerationRequestSchema = z.object({ status: z.enum(["published", "hidden"]) });
