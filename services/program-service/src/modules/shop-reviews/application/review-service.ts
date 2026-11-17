import { DomainError } from "@lavieco/shared";
import type { ReviewCreateRequest, ReviewListQuery, ReviewStatus } from "@lavieco/shared/shop";

import type { OrderLinks } from "../../orders";
import type { ProductRepository } from "../../shop-catalog";
import type { ShopOrderRepository } from "../../shop-orders";

export const REVIEW_REPOSITORY = Symbol("REVIEW_REPOSITORY");

export type ReviewRecord = {
  id: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  variantId: string;
  optionLabel: string;
  orderId: string;
  userId: string | null;
  displayName: string;
  rating: number;
  body: string;
  status: ReviewStatus;
  moderatedBy: string | null;
  createdAt: Date;
};

export class ReviewTakenError extends Error {
  override name = "ReviewTakenError";
}

export interface ReviewRepository {
  newId(): string;
  /** Throws `ReviewTakenError` when this order line already has a review. */
  insert(review: ReviewRecord): Promise<void>;
  reviewedVariants(orderId: string): Promise<string[]>;
  listPublished(productId: string, limit: number): Promise<ReviewRecord[]>;
  stats(productId: string): Promise<{ average: number; count: number }>;
  list(query: ReviewListQuery): Promise<{ items: ReviewRecord[]; nextCursor: string | null }>;
  setStatus(id: string, status: ReviewStatus, by: string): Promise<ReviewRecord | null>;
}

const REVIEWABLE = new Set(["delivered", "completed"]);
const ANONYMOUS = "Khách đã mua";

/**
 * Product reviews (UC-40, BR-24): the signed order link proves the purchase; only lines of
 * a delivered order, once each; plain text; nothing shows before a staff member publishes.
 */
export class ReviewService {
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly orders: ShopOrderRepository,
    private readonly products: ProductRepository,
    private readonly links: OrderLinks,
  ) {}

  async reviewable(token: string) {
    const order = await this.order(token);
    const reviewed = new Set(await this.reviews.reviewedVariants(order.id));
    return {
      publicCode: order.publicCode,
      canReview: REVIEWABLE.has(order.status),
      items: order.items.map((item) => ({
        variantId: item.variantId,
        productSlug: item.productSlug,
        title: item.title,
        optionLabel: item.optionLabel,
        reviewed: reviewed.has(item.variantId),
      })),
    };
  }

  async create(input: ReviewCreateRequest, now = new Date()) {
    const order = await this.order(input.orderToken);
    if (!REVIEWABLE.has(order.status)) throw new DomainError("review.not_allowed");
    const item = order.items.find((line) => line.variantId === input.variantId);
    if (!item) throw new DomainError("review.not_allowed");
    try {
      await this.reviews.insert({
        id: this.reviews.newId(),
        productId: item.productId,
        productSlug: item.productSlug,
        productTitle: item.title,
        variantId: item.variantId,
        optionLabel: item.optionLabel,
        orderId: order.id,
        userId: order.userId,
        // BR-24: the name the reviewer chose, never the email or phone.
        displayName: input.displayName || ANONYMOUS,
        rating: input.rating,
        body: input.body,
        status: "pending",
        moderatedBy: null,
        createdAt: now,
      });
    } catch (error) {
      if (error instanceof ReviewTakenError) throw new DomainError("review.already_reviewed");
      throw error;
    }
  }

  async forProduct(slug: string) {
    const product = await this.products.findBySlug(slug);
    if (!product || product.status !== "published") throw new DomainError("common.not_found");
    const [items, stats] = await Promise.all([
      this.reviews.listPublished(product.id, 20),
      this.reviews.stats(product.id),
    ]);
    return { ...stats, items };
  }

  list(query: ReviewListQuery) {
    return this.reviews.list(query);
  }

  async moderate(id: string, status: "published" | "hidden", by: string) {
    const saved = await this.reviews.setStatus(id, status, by);
    if (!saved) throw new DomainError("common.not_found");
    return saved;
  }

  private async order(token: string) {
    const id = this.links.verify(token);
    const order = id ? await this.orders.findById(id) : null;
    if (!order) throw new DomainError("common.not_found");
    return order;
  }
}
