import { type DynamicModule, Module } from "@nestjs/common";

import { ORDER_LINKS, type OrderLinks } from "../orders";
import { PRODUCT_REPOSITORY, type ProductRepository } from "../shop-catalog";
import { SHOP_ORDER_REPOSITORY, type ShopOrderRepository } from "../shop-orders";
import { ReviewsController } from "./api/reviews.controller";
import {
  REVIEW_REPOSITORY,
  ReviewService,
  type ReviewRepository,
} from "./application/review-service";
import { MongoReviewRepository, reviewPersistence } from "./infrastructure/review.repository";
import { REVIEW_SERVICE } from "./shop-reviews.tokens";

/** Product reviews (BR-24). */
@Module({})
export class ShopReviewsModule {
  static forRoot(deps: {
    orders: DynamicModule;
    shopCatalog: DynamicModule;
    shopOrders: DynamicModule;
  }): DynamicModule {
    return {
      module: ShopReviewsModule,
      imports: [reviewPersistence, deps.orders, deps.shopCatalog, deps.shopOrders],
      controllers: [ReviewsController],
      providers: [
        { provide: REVIEW_REPOSITORY, useClass: MongoReviewRepository },
        {
          provide: REVIEW_SERVICE,
          useFactory: (
            reviews: ReviewRepository,
            orders: ShopOrderRepository,
            products: ProductRepository,
            links: OrderLinks,
          ) => new ReviewService(reviews, orders, products, links),
          inject: [REVIEW_REPOSITORY, SHOP_ORDER_REPOSITORY, PRODUCT_REPOSITORY, ORDER_LINKS],
        },
      ],
    };
  }
}
