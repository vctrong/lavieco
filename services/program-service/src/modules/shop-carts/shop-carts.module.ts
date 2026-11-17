import { type DynamicModule, Module } from "@nestjs/common";

import { PRODUCT_REPOSITORY, type ProductRepository } from "../shop-catalog";
import { CartsController } from "./api/carts.controller";
import { CART_REPOSITORY, CartService, type CartRepository } from "./application/cart-service";
import { MongoCartRepository, cartPersistence } from "./infrastructure/cart.repository";
import { CART_SERVICE } from "./shop-carts.tokens";

/** Carts of the shop (UC-36). */
@Module({})
export class ShopCartsModule {
  static forRoot(shopCatalog: DynamicModule): DynamicModule {
    return {
      module: ShopCartsModule,
      imports: [cartPersistence, shopCatalog],
      controllers: [CartsController],
      providers: [
        { provide: CART_REPOSITORY, useClass: MongoCartRepository },
        {
          provide: CART_SERVICE,
          useFactory: (carts: CartRepository, products: ProductRepository) =>
            new CartService(carts, products),
          inject: [CART_REPOSITORY, PRODUCT_REPOSITORY],
        },
      ],
      exports: [CART_SERVICE],
    };
  }
}
