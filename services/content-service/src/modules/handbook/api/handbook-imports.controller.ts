import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { z } from "zod";

import {
  ApiZodResponse,
  CurrentPrincipal,
  RequestValidationError,
  RequirePermission,
  ZodBody,
  ZodValidationPipe,
  currentRequestId,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import { objectIdSchema } from "@lavieco/shared";
import {
  HANDBOOK_LIMITS,
  handbookImportCreateSchema,
  handbookImportJobSchema,
  handbookUploadCreateSchema,
  handbookUploadSchema,
  type HandbookImportCreate,
  type HandbookUploadCreate,
} from "@lavieco/shared/content";

import type { HandbookImports } from "../application/handbook-imports";
import { HANDBOOK_IMPORTS } from "../handbook.tokens";
import { toJobDto, toUploadDto } from "./handbook.mapper";

const idPipe = new ZodValidationPipe(objectIdSchema);

/**
 * Chunked uploads and background imports of handbook pages (ADR-0029). The admin BFF
 * sends files in pieces of `chunkBytes` (6 MB) so no request exceeds the 10 MB cap.
 */
@ApiTags("handbook")
@Controller("internal/v1/handbook")
export class HandbookImportsController {
  constructor(@Inject(HANDBOOK_IMPORTS) private readonly imports: HandbookImports) {}

  @Post("uploads")
  @HttpCode(201)
  @RequirePermission("handbook:write")
  @ApiOperation({ summary: "Announce a PDF (≤ 200 MB) or page image (≤ 25 MB) to send in chunks" })
  @ApiZodResponse(201, handbookUploadSchema)
  async createUpload(
    @ZodBody(handbookUploadCreateSchema) body: HandbookUploadCreate,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toUploadDto(await this.imports.createUpload(body, staff));
  }

  @Put("uploads/:id/chunks/:index")
  @RequirePermission("handbook:write")
  @UseInterceptors(
    FileInterceptor("chunk", {
      storage: memoryStorage(),
      limits: { fileSize: HANDBOOK_LIMITS.chunkBytes, files: 1, fields: 0, parts: 2 },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["chunk"],
      properties: { chunk: { type: "string", format: "binary" } },
    },
  })
  @ApiOperation({ summary: "One chunk of an upload, in order (a repeated chunk is accepted)" })
  @ApiZodResponse(200, handbookUploadSchema)
  async chunk(
    @Param("id", idPipe) id: string,
    @Param("index", ParseIntPipe) index: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    if (!file || file.size === 0) {
      throw new RequestValidationError([{ path: "chunk", message: "A chunk is required" }]);
    }
    const bytes = new Uint8Array(
      file.buffer.buffer,
      file.buffer.byteOffset,
      file.buffer.byteLength,
    );
    return toUploadDto(await this.imports.receiveChunk(id, index, bytes, staff));
  }

  @Post("imports")
  @HttpCode(202)
  @RequirePermission("handbook:write")
  @ApiOperation({ summary: "Queue an import of complete uploads into the draft (audited)" })
  @ApiZodResponse(202, handbookImportJobSchema)
  async createImport(
    @ZodBody(handbookImportCreateSchema) body: HandbookImportCreate,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toJobDto(
      await this.imports.createImport(body, {
        userId: staff.userId,
        name: "",
        roles: staff.roles,
        requestId: currentRequestId() ?? null,
      }),
    );
  }

  @Get("imports")
  @RequirePermission("handbook:read")
  @ApiOperation({ summary: "The 10 latest imports, with progress and place in line" })
  @ApiZodResponse(200, z.object({ items: z.array(handbookImportJobSchema) }))
  async listImports() {
    return { items: (await this.imports.listJobs()).map(toJobDto) };
  }

  @Get("imports/:id")
  @RequirePermission("handbook:read")
  @ApiOperation({ summary: "Progress of one import" })
  @ApiZodResponse(200, handbookImportJobSchema)
  async getImport(@Param("id", idPipe) id: string) {
    return toJobDto(await this.imports.getJob(id));
  }
}
