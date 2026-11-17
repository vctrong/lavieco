import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiOperation, ApiProduces, ApiTags } from "@nestjs/swagger";
import { memoryStorage } from "multer";

import {
  ApiZodResponse,
  CurrentPrincipal,
  RequirePermission,
  ZodBody,
  ZodValidationPipe,
  currentRequestId,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import { DomainError, objectIdSchema } from "@lavieco/shared";
import {
  IMPORT_LIMITS,
  importImagesRequestSchema,
  importJobSchema,
  importModeSchema,
  importRemovedImagesRequestSchema,
  importRowSkipRequestSchema,
  importRowUpdateRequestSchema,
  type ImportImagesRequest,
  type ImportRemovedImagesRequest,
  type ImportRowUpdateRequest,
} from "@lavieco/shared/shop";

import { ImportService, type ImportActor } from "../application/import-service";
import { IMPORT_SERVICE } from "../shop-imports.tokens";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const idPipe = new ZodValidationPipe(objectIdSchema);

const actorOf = (staff: StaffPrincipal): ImportActor => ({
  userId: staff.userId,
  roles: staff.roles,
  requestId: currentRequestId() ?? null,
});

const file = (content: { fileName: string; content: Buffer }) =>
  new StreamableFile(content.content, {
    type: XLSX,
    disposition: `attachment; filename="${content.fileName}"`,
    length: content.content.length,
  });

/** Bulk import and export of products (UC-39, docs/08 §8). */
@ApiTags("shop-imports")
@Controller("internal/v1/shop")
export class ImportsController {
  constructor(@Inject(IMPORT_SERVICE) private readonly imports: ImportService) {}

  @Get("import/template")
  @RequirePermission("product:import")
  @ApiProduces(XLSX)
  @ApiOperation({ summary: "Excel template with example rows and the column guide" })
  async template() {
    return file(await this.imports.template());
  }

  @Get("products/export")
  @RequirePermission("product:read")
  @ApiProduces(XLSX)
  @ApiOperation({ summary: "Every product in the import format (export → edit → import update)" })
  async export() {
    return file(await this.imports.export());
  }

  @Post("import-jobs")
  @RequirePermission("product:import")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: IMPORT_LIMITS.fileBytes, files: 1 },
    }),
  )
  @ApiOperation({
    summary: "Upload an .xlsx/.csv: parsed and validated row by row, nothing saved yet",
  })
  @ApiZodResponse(201, importJobSchema)
  async upload(
    @UploadedFile() upload: Express.Multer.File | undefined,
    @Body("mode") modeText: unknown,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    const mode = importModeSchema.safeParse(modeText);
    if (!upload || !mode.success) throw new DomainError("import.file_invalid");
    const view = await this.imports.upload(
      { bytes: upload.buffer, name: upload.originalname },
      mode.data,
      actorOf(staff),
    );
    return this.imports.withExistingImages(view);
  }

  @Get("import-jobs/:id")
  @RequirePermission("product:import")
  @ApiOperation({ summary: "An import job with its rows, issues and results" })
  @ApiZodResponse(200, importJobSchema)
  async get(@Param("id", idPipe) id: string) {
    return this.imports.withExistingImages(await this.imports.get(id));
  }

  @Patch("import-jobs/:id/rows/:row")
  @RequirePermission("product:import")
  @ApiOperation({ summary: "Fix cells of one row; the whole file is validated again" })
  @ApiZodResponse(200, importJobSchema)
  async updateRow(
    @Param("id", idPipe) id: string,
    @Param("row", ParseIntPipe) row: number,
    @ZodBody(importRowUpdateRequestSchema) body: ImportRowUpdateRequest,
  ) {
    return this.imports.withExistingImages(await this.imports.updateRow(id, row, body.raw));
  }

  @Post("import-jobs/:id/rows/:row/skip")
  @HttpCode(200)
  @RequirePermission("product:import")
  @ApiOperation({ summary: "Set a row aside (or take it back)" })
  @ApiZodResponse(200, importJobSchema)
  async skip(
    @Param("id", idPipe) id: string,
    @Param("row", ParseIntPipe) row: number,
    @ZodBody(importRowSkipRequestSchema) body: { skipped: boolean },
  ) {
    return this.imports.withExistingImages(await this.imports.skipRow(id, row, body.skipped));
  }

  @Post("import-jobs/:id/images")
  @HttpCode(200)
  @RequirePermission("product:import")
  @ApiOperation({ summary: "Register uploaded images by file name (matched to rows)" })
  @ApiZodResponse(200, importJobSchema)
  async images(
    @Param("id", idPipe) id: string,
    @ZodBody(importImagesRequestSchema) body: ImportImagesRequest,
  ) {
    return this.imports.withExistingImages(await this.imports.addImages(id, body));
  }

  @Put("import-jobs/:id/removed-images")
  @RequirePermission("product:import")
  @ApiOperation({ summary: "Current images of a product to drop on update" })
  @ApiZodResponse(200, importJobSchema)
  async removedImages(
    @Param("id", idPipe) id: string,
    @ZodBody(importRemovedImagesRequestSchema) body: ImportRemovedImagesRequest,
  ) {
    return this.imports.withExistingImages(await this.imports.setRemovedImages(id, body));
  }

  @Post("import-jobs/:id/commit")
  @HttpCode(200)
  @RequirePermission("product:import")
  @ApiOperation({ summary: "Save the next batch of products; call again while `committing`" })
  @ApiZodResponse(200, importJobSchema)
  async commit(@Param("id", idPipe) id: string, @CurrentPrincipal() staff: StaffPrincipal) {
    return this.imports.withExistingImages(await this.imports.commit(id, actorOf(staff)));
  }

  @Post("import-jobs/:id/cancel")
  @HttpCode(200)
  @RequirePermission("product:import")
  @ApiOperation({ summary: "Drop the job (uploaded images are swept after 24 h)" })
  @ApiZodResponse(200, importJobSchema)
  async cancel(@Param("id", idPipe) id: string) {
    return this.imports.withExistingImages(await this.imports.cancel(id));
  }
}
