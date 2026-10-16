import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";
import { json } from "express";

import type { Logger } from "@lavieco/observability";

import { ProblemDetailsFilter } from "../errors/problem-details.filter";
import { requestIdMiddleware } from "../request-context/request-context";

/**
 * Cross-cutting setup shared by every service and by the integration tests, so the
 * app under test is wired exactly like the deployed one.
 */
export function configureServiceApp(app: INestApplication, logger: Logger) {
  const http = app.getHttpAdapter().getInstance() as { disable?: (setting: string) => void };
  http.disable?.("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(json({ limit: "100kb" }));
  app.useGlobalFilters(new ProblemDetailsFilter(logger));
  app.enableShutdownHooks();
}

/** OpenAPI generated from the code (`npm run gen:openapi`, docs/04 §6.4). */
export function buildOpenApiDocument(
  app: INestApplication,
  info: { title: string; version: string; description: string },
): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle(info.title)
    .setVersion(info.version)
    .setDescription(info.description)
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}
