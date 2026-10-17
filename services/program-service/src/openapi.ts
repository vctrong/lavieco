import "reflect-metadata";

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { NestFactory } from "@nestjs/core";

import { createLogger } from "@lavieco/observability";
import { buildOpenApiDocument } from "@lavieco/service-kit";

import { AppModule } from "./app.module";
import { programEnvSchema } from "./config/env";

/**
 * `npm run gen:openapi`: writes docs/api/program-service.openapi.json from the code
 * (docs/04 §6.4). Runs in preview mode: no database, no network, placeholder config.
 */
async function generate() {
  const env = programEnvSchema.parse({
    PORT: "4004",
    MONGODB_URI: "mongodb://127.0.0.1:1/openapi",
    MONGODB_DB: "lavieco_program",
    IDENTITY_JWKS_URL: "http://127.0.0.1:1/.well-known/jwks.json",
    WEB_APP_URL: "http://localhost:3000",
    REVALIDATE_SECRET: Buffer.alloc(32).toString("base64"),
    CONTENT_SERVICE_URL: "http://127.0.0.1:1",
    SERVICE_TOKEN_PRIVATE_JWK: "openapi",
  });
  const logger = createLogger({ service: "program-service", level: "silent" });
  const app = await NestFactory.create(AppModule.forRoot(env, { logger }), {
    preview: true,
    abortOnError: false,
    logger: false,
  });
  const document = buildOpenApiDocument(app, {
    title: "program-service",
    version: "1",
    description:
      "Internal API of program-service (private network only). Generated from code: do not edit.",
  });
  const target = resolve(__dirname, "../../../docs/api/program-service.openapi.json");
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
}

void generate();
