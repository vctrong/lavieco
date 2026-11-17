import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AllowServices, ApiZodResponse, ZodQuery, ZodValidationPipe } from "@lavieco/service-kit";
import { DomainError } from "@lavieco/shared";
import {
  productSlugSchema,
  publicCategoryListSchema,
  publicProductListQuerySchema,
  publicProductListSchema,
  publicProductSchema,
  publicShopSettingsSchema,
  type PublicProductListQuery,
} from "@lavieco/shared/shop";

import { CatalogAdminService } from "../application/catalog-admin-service";
import { CatalogPublicService } from "../application/catalog-public-service";
import { CATALOG_ADMIN_SERVICE, CATALOG_PUBLIC_SERVICE } from "../shop-catalog.tokens";
import { toPublicCardDto, toPublicProductDto } from "./catalog.mapper";

/** `/bo-suu-tap` of `web` (UC-35): published products only (S3). */
@ApiTags("shop-public")
@Controller("internal/v1/shop/public")
export class CatalogPublicController {
  constructor(
    @Inject(CATALOG_PUBLIC_SERVICE) private readonly catalog: CatalogPublicService,
    @Inject(CATALOG_ADMIN_SERVICE) private readonly admin: CatalogAdminService,
  ) {}

  @Get("categories")
  @AllowServices("web")
  @ApiOperation({ summary: "Categories shown as filters" })
  @ApiZodResponse(200, publicCategoryListSchema)
  async categories() {
    const items = await this.catalog.categories();
    return { items: items.map((c) => ({ key: c.key, name: c.name, description: c.description })) };
  }

  @Get("products")
  @AllowServices("web")
  @ApiOperation({ summary: "Published products, filtered and sorted" })
  @ApiZodResponse(200, publicProductListSchema)
  async list(@ZodQuery(publicProductListQuerySchema) query: PublicProductListQuery) {
    const page = await this.catalog.list(query);
    return { items: page.items.map(toPublicCardDto), nextCursor: page.nextCursor };
  }

  @Get("products/:slug")
  @AllowServices("web")
  @ApiOperation({ summary: "One published product by current or former slug; 404 otherwise" })
  @ApiZodResponse(200, publicProductSchema)
  async get(@Param("slug", new ZodValidationPipe(productSlugSchema)) slug: string) {
    const bundle = await this.catalog.get(slug);
    if (!bundle) throw new DomainError("common.not_found");
    return toPublicProductDto(bundle);
  }

  @Get("settings")
  @AllowServices("web")
  @ApiOperation({ summary: "Delivery fee, pickup and COD rules shown at checkout" })
  @ApiZodResponse(200, publicShopSettingsSchema)
  async settings() {
    const s = await this.admin.settings();
    return {
      shippingFee: s.shippingFee,
      freeShippingFrom: s.freeShippingFrom,
      pickup: s.pickup,
      cod: s.cod,
      returnDays: s.returnDays,
    };
  }
}
