import { Controller, Get, HttpCode, Inject, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  AllowServices,
  ApiZodResponse,
  CurrentPrincipal,
  RequireMember,
  ZodBody,
  ZodValidationPipe,
  type MemberPrincipal,
} from "@lavieco/service-kit";
import { objectIdSchema } from "@lavieco/shared";
import {
  cartClaimRequestSchema,
  cartItemSetRequestSchema,
  cartSchema,
  cartTokenSchema,
  type CartItemSetRequest,
} from "@lavieco/shared/shop";

import { CartService } from "../application/cart-service";
import { CART_SERVICE } from "../shop-carts.tokens";

const tokenPipe = new ZodValidationPipe(cartTokenSchema);
const idPipe = new ZodValidationPipe(objectIdSchema);

/** `/gio-hang` of `web` (UC-36): the cookie token is the cart's key. */
@ApiTags("shop-carts")
@Controller("internal/v1/shop")
export class CartsController {
  constructor(@Inject(CART_SERVICE) private readonly carts: CartService) {}

  @Get("public/carts/:token")
  @AllowServices("web")
  @ApiOperation({ summary: "A cart priced from the catalogue as it is now" })
  @ApiZodResponse(200, cartSchema)
  view(@Param("token", tokenPipe) token: string) {
    return this.carts.view(token);
  }

  @Put("public/carts/:token/items/:variantId")
  @AllowServices("web")
  @ApiOperation({ summary: "Set the quantity of a variant (0 removes it); creates the cart" })
  @ApiZodResponse(200, cartSchema)
  setItem(
    @Param("token", tokenPipe) token: string,
    @Param("variantId", idPipe) variantId: string,
    @ZodBody(cartItemSetRequestSchema) body: CartItemSetRequest,
  ) {
    return this.carts.setItem(token, variantId, body.quantity);
  }

  @Post("me/cart/claim")
  @HttpCode(200)
  @RequireMember()
  @ApiOperation({ summary: "Signed in: this device's cart becomes the member's, merged" })
  @ApiZodResponse(200, cartSchema)
  claim(
    @ZodBody(cartClaimRequestSchema) body: { token: string },
    @CurrentPrincipal() member: MemberPrincipal,
  ) {
    return this.carts.claim(body.token, member.userId);
  }
}
