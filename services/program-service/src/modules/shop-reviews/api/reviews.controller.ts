import { Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import {
  AllowServices,
  ApiZodResponse,
  CurrentPrincipal,
  RequirePermission,
  ZodBody,
  ZodQuery,
  ZodValidationPipe,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import { objectIdSchema } from "@lavieco/shared";
import {
  productReviewsSchema,
  productSlugSchema,
  reviewAdminSchema,
  reviewCreateRequestSchema,
  reviewListQuerySchema,
  reviewListSchema,
  reviewModerationRequestSchema,
  reviewableOrderSchema,
  type ReviewCreateRequest,
  type ReviewListQuery,
} from "@lavieco/shared/shop";

import { ReviewService, type ReviewRecord } from "../application/review-service";
import { REVIEW_SERVICE } from "../shop-reviews.tokens";

const tokenPipe = new ZodValidationPipe(z.string().min(20).max(200));

const toAdmin = (review: ReviewRecord) => ({
  id: review.id,
  productSlug: review.productSlug,
  productTitle: review.productTitle,
  optionLabel: review.optionLabel,
  orderId: review.orderId,
  displayName: review.displayName,
  rating: review.rating,
  body: review.body,
  status: review.status,
  createdAt: review.createdAt.toISOString(),
});

/** Reviews (BR-24): written from the order link, published by staff (`order:fulfill`). */
@ApiTags("shop-reviews")
@Controller("internal/v1/shop")
export class ReviewsController {
  constructor(@Inject(REVIEW_SERVICE) private readonly reviews: ReviewService) {}

  @Get("public/reviews/orders/:token")
  @AllowServices("web")
  @ApiOperation({ summary: "Lines of a delivered order that can still be reviewed" })
  @ApiZodResponse(200, reviewableOrderSchema)
  reviewable(@Param("token", tokenPipe) token: string) {
    return this.reviews.reviewable(token);
  }

  @Post("public/reviews")
  @HttpCode(201)
  @AllowServices("web")
  @ApiOperation({ summary: "Write a review (pending until moderated)" })
  async create(@ZodBody(reviewCreateRequestSchema) body: ReviewCreateRequest) {
    await this.reviews.create(body);
    return { status: "pending" };
  }

  @Get("public/products/:slug/reviews")
  @AllowServices("web")
  @ApiOperation({ summary: "Published reviews and the average rating of a product" })
  @ApiZodResponse(200, productReviewsSchema)
  async forProduct(@Param("slug", new ZodValidationPipe(productSlugSchema)) slug: string) {
    const result = await this.reviews.forProduct(slug);
    return {
      average: result.average,
      count: result.count,
      items: result.items.map((r) => ({
        displayName: r.displayName,
        rating: r.rating,
        body: r.body,
        optionLabel: r.optionLabel,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  @Get("reviews")
  @RequirePermission("order:fulfill")
  @ApiOperation({ summary: "Reviews to moderate (pending by default)" })
  @ApiZodResponse(200, reviewListSchema)
  async list(@ZodQuery(reviewListQuerySchema) query: ReviewListQuery) {
    const page = await this.reviews.list(query);
    return { items: page.items.map(toAdmin), nextCursor: page.nextCursor };
  }

  @Post("reviews/:id/status")
  @HttpCode(200)
  @RequirePermission("order:fulfill")
  @ApiOperation({ summary: "Publish or hide a review" })
  @ApiZodResponse(200, reviewAdminSchema)
  async moderate(
    @Param("id", new ZodValidationPipe(objectIdSchema)) id: string,
    @ZodBody(reviewModerationRequestSchema) body: { status: "published" | "hidden" },
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toAdmin(await this.reviews.moderate(id, body.status, staff.userId));
  }
}
