import {
  applyDecorators,
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  PayloadTooLargeException,
  UseInterceptors,
  mixin,
  type Type,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes } from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { catchError, type Observable, throwError } from "rxjs";

import { RequestValidationError } from "@lavieco/service-kit";
import { DomainError } from "@lavieco/shared";

/** Multer's size error becomes the same `media.too_large` the use case would raise. */
function uploadErrors(): Type<NestInterceptor> {
  @Injectable()
  class UploadErrorsInterceptor implements NestInterceptor {
    intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
      return next
        .handle()
        .pipe(
          catchError((error: unknown) =>
            throwError(() =>
              error instanceof PayloadTooLargeException
                ? new DomainError("media.too_large")
                : error,
            ),
          ),
        );
    }
  }
  return mixin(UploadErrorsInterceptor);
}

/**
 * One image in the multipart part `file`, kept in memory (never written to disk) and
 * capped at `maxBytes` while it streams in. Extra text fields are listed in `fields`.
 */
export function ImageUpload(
  maxBytes: number,
  fields: Record<string, Record<string, unknown>> = {},
) {
  return applyDecorators(
    UseInterceptors(
      uploadErrors(),
      FileInterceptor("file", {
        storage: memoryStorage(),
        limits: { fileSize: maxBytes, files: 1, fields: Object.keys(fields).length, parts: 4 },
      }),
    ),
    ApiConsumes("multipart/form-data"),
    ApiBody({
      schema: {
        type: "object",
        required: ["file", ...Object.keys(fields)],
        properties: { file: { type: "string", format: "binary" }, ...fields },
      },
    }),
  );
}

/** The uploaded bytes, or a 400 naming the missing `file` part. */
export function requireFile(file: Express.Multer.File | undefined): Uint8Array {
  if (!file || file.size === 0) {
    throw new RequestValidationError([{ path: "file", message: "An image file is required" }]);
  }
  return new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength);
}
