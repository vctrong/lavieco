import "reflect-metadata";

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { NestFactory } from "@nestjs/core";
import { exportJWK, generateKeyPair } from "jose";

import { createLogger } from "@lavieco/observability";
import { buildOpenApiDocument } from "@lavieco/service-kit";

import { AppModule } from "./app.module";
import { identityEnvSchema } from "./config/env";

/**
 * `npm run gen:openapi`: writes docs/api/identity-service.openapi.json from the code
 * (docs/04 §6.4). Runs in preview mode: no database, no network, placeholder config.
 */
async function generate() {
  // Throw-away key generated on the fly: no key material is ever committed.
  const { privateKey } = await generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
  const env = identityEnvSchema.parse({
    PORT: "4001",
    MONGODB_URI: "mongodb://127.0.0.1:1/openapi",
    MONGODB_DB: "lavieco_identity",
    JWT_SIGNING_KEYS: JSON.stringify([{ ...(await exportJWK(privateKey)), kid: "openapi" }]),
    TOTP_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64"),
    OTP_PEPPER: Buffer.alloc(32).toString("base64"),
    ADMIN_APP_URL: "http://localhost:3001",
    WEB_APP_URL: "http://localhost:3000",
    SMTP_HOST: "localhost",
    SMTP_PORT: "1025",
    MAIL_FROM: "openapi@localhost",
  });
  const logger = createLogger({ service: "identity-service", level: "silent" });
  const app = await NestFactory.create(AppModule.forRoot(env, { logger }), {
    preview: true,
    abortOnError: false,
    logger: false,
  });
  const document = buildOpenApiDocument(app, {
    title: "identity-service",
    version: "1",
    description:
      "Internal API of identity-service (private network only). Generated from code: do not edit.",
  });
  const target = resolve(__dirname, "../../../docs/api/identity-service.openapi.json");
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
}

void generate();
