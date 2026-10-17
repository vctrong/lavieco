import "reflect-metadata";

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { NestFactory } from "@nestjs/core";

import { createLogger } from "@lavieco/observability";
import { buildOpenApiDocument } from "@lavieco/service-kit";

import { AppModule } from "./app.module";
import { contentEnvSchema } from "./config/env";

/**
 * `npm run gen:openapi`: writes docs/api/content-service.openapi.json from the code
 * (docs/04 §6.4). Runs in preview mode: no database, no network, placeholder config.
 */
async function generate() {
  const env = contentEnvSchema.parse({
    PORT: "4002",
    MONGODB_URI: "mongodb://127.0.0.1:1/openapi",
    MONGODB_DB: "lavieco_content",
    IDENTITY_JWKS_URL: "http://127.0.0.1:1/.well-known/jwks.json",
    CLOUDINARY_CLOUD_NAME: "openapi",
    CLOUDINARY_API_KEY: "openapi",
    CLOUDINARY_API_SECRET: "openapi",
  });
  const logger = createLogger({ service: "content-service", level: "silent" });
  const app = await NestFactory.create(AppModule.forRoot(env, { logger, runMediaSweeper: false }), {
    preview: true,
    abortOnError: false,
    logger: false,
  });
  const document = buildOpenApiDocument(app, {
    title: "content-service",
    version: "1",
    description:
      "Internal API of content-service (private network only). Generated from code: do not edit.",
  });
  const target = resolve(__dirname, "../../../docs/api/content-service.openapi.json");
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
}

void generate();
