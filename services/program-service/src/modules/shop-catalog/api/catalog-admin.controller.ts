import { Controller, Get, HttpCode, Inject, Param, Patch, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  ApiZodResponse,
  CurrentPrincipal,
  RequirePermission,
  ZodBody,
  ZodQuery,
  ZodValidationPipe,
  currentRequestId,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import { objectIdSchema } from "@lavieco/shared";
import {
  partnerBrandListSchema,
  partnerBrandSchema,
  partnerBrandUpsertRequestSchema,
  productCategoryCreateRequestSchema,
  productCategoryListSchema,
  productCategorySchema,
  productCategoryUpdateRequestSchema,
  productCreateRequestSchema,
  productListQuerySchema,
  productListSchema,
  productRevisionRequestSchema,
  productSchema,
  productStatusRequestSchema,
  productUpdateRequestSchema,
  productVariantSchema,
  shopSettingsSchema,
  shopSettingsUpdateRequestSchema,
  stockAdjustRequestSchema,
  stockMovementListSchema,
  type PartnerBrandUpsertRequest,
  type ProductCategoryCreateRequest,
  type ProductCategoryUpdateRequest,
  type ProductCreateRequest,
  type ProductListQuery,
  type ProductRevisionRequest,
  type ProductStatusRequest,
  type ProductUpdateRequest,
  type ShopSettingsUpdateRequest,
  type StockAdjustRequest,
} from "@lavieco/shared/shop";

import { CatalogAdminService } from "../application/catalog-admin-service";
import { ProductAdminService, type ShopActor } from "../application/product-admin-service";
import { CATALOG_ADMIN_SERVICE, PRODUCT_ADMIN_SERVICE } from "../shop-catalog.tokens";
import {
  toBrandDto,
  toCategoryDto,
  toMovementDto,
  toProductDto,
  toProductListItemDto,
  toSettingsDto,
  toVariantDto,
} from "./catalog.mapper";

const idPipe = new ZodValidationPipe(objectIdSchema);

const actorOf = (staff: StaffPrincipal): ShopActor => ({
  userId: staff.userId,
  roles: staff.roles,
  requestId: currentRequestId() ?? null,
});

/** "Cửa hàng" in the back office (UC-38, ADR-0028): products, categories, brands, settings. */
@ApiTags("shop")
@Controller("internal/v1/shop")
export class CatalogAdminController {
  constructor(
    @Inject(PRODUCT_ADMIN_SERVICE) private readonly products: ProductAdminService,
    @Inject(CATALOG_ADMIN_SERVICE) private readonly catalog: CatalogAdminService,
  ) {}

  // ------------------------------------------------------------ products

  @Get("products")
  @RequirePermission("product:read")
  @ApiOperation({ summary: "Products for the back office (drafts included), newest edit first" })
  @ApiZodResponse(200, productListSchema)
  async list(@ZodQuery(productListQuerySchema) query: ProductListQuery) {
    const page = await this.products.list(query);
    return { items: page.items.map(toProductListItemDto), nextCursor: page.nextCursor };
  }

  @Post("products")
  @RequirePermission("product:write")
  @ApiOperation({ summary: "Create a draft product with its variants and images" })
  @ApiZodResponse(201, productSchema)
  async create(
    @ZodBody(productCreateRequestSchema) body: ProductCreateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toProductDto(await this.products.create(body, actorOf(staff)));
  }

  @Get("products/:id")
  @RequirePermission("product:read")
  @ApiOperation({ summary: "One product with its variants, stock and publish checklist" })
  @ApiZodResponse(200, productSchema)
  async get(@Param("id", idPipe) id: string) {
    return toProductDto(await this.products.get(id));
  }

  @Put("products/:id")
  @RequirePermission("product:write")
  @ApiOperation({ summary: "Save a product (optimistic `revision`); removed images are released" })
  @ApiZodResponse(200, productSchema)
  async update(
    @Param("id", idPipe) id: string,
    @ZodBody(productUpdateRequestSchema) body: ProductUpdateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toProductDto(await this.products.update(id, body, actorOf(staff)));
  }

  @Post("products/:id/status")
  @HttpCode(200)
  @RequirePermission("product:publish")
  @ApiOperation({ summary: "Publish (BR-20), hide, archive or return to draft" })
  @ApiZodResponse(200, productSchema)
  async setStatus(
    @Param("id", idPipe) id: string,
    @ZodBody(productStatusRequestSchema) body: ProductStatusRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toProductDto(await this.products.setStatus(id, body, actorOf(staff)));
  }

  @Post("products/:id/impact/approve")
  @HttpCode(200)
  @RequirePermission("impact:approve")
  @ApiOperation({ summary: "Approve the product's impact figures (BR-09, BR-23)" })
  @ApiZodResponse(200, productSchema)
  async approveImpact(
    @Param("id", idPipe) id: string,
    @ZodBody(productRevisionRequestSchema) body: ProductRevisionRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toProductDto(await this.products.approveImpact(id, body.revision, actorOf(staff)));
  }

  @Post("variants/:id/stock-adjustments")
  @RequirePermission("product:write")
  @ApiOperation({ summary: "Receive, remove or count stock of one variant (never below held)" })
  @ApiZodResponse(201, productVariantSchema)
  async adjustStock(
    @Param("id", idPipe) id: string,
    @ZodBody(stockAdjustRequestSchema) body: StockAdjustRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toVariantDto(await this.products.adjustStock(id, body, actorOf(staff)));
  }

  @Get("variants/:id/stock-movements")
  @RequirePermission("product:read")
  @ApiOperation({ summary: "Latest 100 stock movements of a variant" })
  @ApiZodResponse(200, stockMovementListSchema)
  async movements(@Param("id", idPipe) id: string) {
    return { items: (await this.products.movements(id)).map(toMovementDto) };
  }

  // ------------------------------------------------------------ categories

  @Get("categories")
  @RequirePermission("product:read")
  @ApiOperation({ summary: "Product categories, archived included" })
  @ApiZodResponse(200, productCategoryListSchema)
  async categories() {
    return { items: (await this.catalog.categories()).map(toCategoryDto) };
  }

  @Post("categories")
  @RequirePermission("product:write")
  @ApiOperation({ summary: "Create a category (its key comes from the name and never changes)" })
  @ApiZodResponse(201, productCategorySchema)
  async createCategory(
    @ZodBody(productCategoryCreateRequestSchema) body: ProductCategoryCreateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toCategoryDto(await this.catalog.createCategory(body, actorOf(staff)));
  }

  @Patch("categories/:id")
  @RequirePermission("product:write")
  @ApiOperation({ summary: "Rename, reorder or archive a category" })
  @ApiZodResponse(200, productCategorySchema)
  async updateCategory(
    @Param("id", idPipe) id: string,
    @ZodBody(productCategoryUpdateRequestSchema) body: ProductCategoryUpdateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toCategoryDto(await this.catalog.updateCategory(id, body, actorOf(staff)));
  }

  // ------------------------------------------------------------ partner brands

  @Get("brands")
  @RequirePermission("product:read")
  @ApiOperation({ summary: "Partner brands (with their commission rate, BR-25)" })
  @ApiZodResponse(200, partnerBrandListSchema)
  async brands() {
    return { items: (await this.catalog.brands()).map(toBrandDto) };
  }

  @Post("brands")
  @RequirePermission("product:write")
  @ApiOperation({ summary: "Add a partner brand" })
  @ApiZodResponse(201, partnerBrandSchema)
  async createBrand(
    @ZodBody(partnerBrandUpsertRequestSchema) body: PartnerBrandUpsertRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toBrandDto(await this.catalog.upsertBrand(null, body, actorOf(staff)));
  }

  @Put("brands/:id")
  @RequirePermission("product:write")
  @ApiOperation({ summary: "Edit a partner brand" })
  @ApiZodResponse(200, partnerBrandSchema)
  async updateBrand(
    @Param("id", idPipe) id: string,
    @ZodBody(partnerBrandUpsertRequestSchema) body: PartnerBrandUpsertRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toBrandDto(await this.catalog.upsertBrand(id, body, actorOf(staff)));
  }

  // ------------------------------------------------------------ settings

  @Get("settings")
  @RequirePermission("product:read")
  @ApiOperation({ summary: "Delivery fee, free-delivery threshold, pickup, COD limit, hold time" })
  @ApiZodResponse(200, shopSettingsSchema)
  async settings() {
    return toSettingsDto(await this.catalog.settings());
  }

  @Put("settings")
  @RequirePermission("product:write")
  @ApiOperation({ summary: "Save the shop settings (revision 0 = defaults never saved)" })
  @ApiZodResponse(200, shopSettingsSchema)
  async saveSettings(
    @ZodBody(shopSettingsUpdateRequestSchema) body: ShopSettingsUpdateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toSettingsDto(await this.catalog.saveSettings(body, actorOf(staff)));
  }
}
