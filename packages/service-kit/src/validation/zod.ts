import { Body, type PipeTransform, Query } from "@nestjs/common";
import { ApiBody, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { z } from "zod";

import type { FieldError } from "@lavieco/shared";

/** Thrown when a request does not match its Zod schema; becomes a 400 Problem Details. */
export class RequestValidationError extends Error {
  constructor(readonly errors: FieldError[]) {
    super("Request validation failed");
    this.name = "RequestValidationError";
  }
}

/** Validates (and transforms) an incoming value with a Zod schema (docs/04 §6.2, `api` layer). */
export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const parsed = this.schema.safeParse(value);
    if (parsed.success) return parsed.data;
    throw new RequestValidationError(
      parsed.error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    );
  }
}

/** OpenAPI fragment generated from a Zod schema (OpenAPI is never written by hand). */
export function toOpenApiSchema(schema: z.ZodType, io: "input" | "output") {
  return z.toJSONSchema(schema, { target: "openapi-3.0", io, unrepresentable: "any" }) as Record<
    string,
    unknown
  >;
}

/**
 * `@ZodBody(schema)` on a handler parameter: validates the JSON body and documents it
 * in the generated OpenAPI. Replaces `@Body()`.
 */
export function ZodBody(schema: z.ZodType): ParameterDecorator {
  return (target, propertyKey, index) => {
    Body(new ZodValidationPipe(schema))(target, propertyKey, index);
    if (propertyKey === undefined) return;
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    if (descriptor) {
      ApiBody({ schema: toOpenApiSchema(schema, "input") })(target, propertyKey, descriptor);
    }
  };
}

/** `@ZodQuery(schema)`: validates the whole query string object. */
export function ZodQuery(schema: z.ZodObject): ParameterDecorator {
  return (target, propertyKey, index) => {
    Query(new ZodValidationPipe(schema))(target, propertyKey, index);
    if (propertyKey === undefined) return;
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    if (!descriptor) return;
    for (const [name, field] of Object.entries(schema.shape)) {
      ApiQuery({
        name,
        required: !(field as z.ZodType).safeParse(undefined).success,
        schema: toOpenApiSchema(field as z.ZodType, "input"),
      })(target, propertyKey, descriptor);
    }
  };
}

/** Documents a response body generated from a Zod schema. */
export function ApiZodResponse(status: number, schema?: z.ZodType): MethodDecorator {
  return ApiResponse({
    status,
    ...(schema ? { schema: toOpenApiSchema(schema, "output") } : {}),
  });
}
