import "reflect-metadata";

import { randomBytes, randomUUID } from "node:crypto";
import { Writable } from "node:stream";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { SignJWT, exportJWK, generateKeyPair, type KeyLike } from "jose";
import { mongo } from "mongoose";
import request from "supertest";

import { createLogger } from "@lavieco/observability";
import { configureServiceApp, OutboxWorker } from "@lavieco/service-kit";
import type { EmailMessage, EmailSender } from "@lavieco/service-kit/ports";
import type { ServiceName } from "@lavieco/shared";

import { AppModule } from "../../app.module";
import { runMigrations } from "../../cli/migrate";
import { identityEnvSchema, type IdentityEnv } from "../../config/env";

/** Captures outgoing email instead of sending it. */
export class FakeEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  async send(message: EmailMessage) {
    this.sent.push(message);
  }
  lastTo(to: string): EmailMessage | undefined {
    return [...this.sent].reverse().find((message) => message.to === to);
  }
  /** The 6-digit code in the last email sent to `to`. */
  codeFor(to: string): string {
    const code = this.lastTo(to)?.text.match(/\b(\d{6})\b/)?.[1];
    if (!code) throw new Error(`no code emailed to ${to}`);
    return code;
  }
}

type CallerKey = { privateKey: KeyLike; kid: string };

export type TestApp = {
  app: INestApplication;
  http: () => ReturnType<typeof request>;
  emails: FakeEmailSender;
  logs: string[];
  env: IdentityEnv;
  db: mongo.Db;
  serviceToken: (caller: ServiceName, audience?: ServiceName) => Promise<string>;
  close: () => Promise<void>;
};

async function callerKey(name: string) {
  const { privateKey, publicKey } = await generateKeyPair("EdDSA", { crv: "Ed25519" });
  const kid = `${name}-test`;
  return { key: { privateKey, kid }, publicJwk: { ...(await exportJWK(publicKey)), kid } };
}

/**
 * Boots the real identity-service module graph against the shared test replica set,
 * with email captured, the outbox worker driven manually and logs captured to assert
 * that no personal data is written.
 */
export async function createTestApp(
  mongoUri: string,
  configure?: (builder: ReturnType<typeof Test.createTestingModule>) => void,
): Promise<TestApp> {
  const signing = await generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
  const web = await callerKey("web");
  const admin = await callerKey("admin");
  const program = await callerKey("program-service");
  const callers: Partial<Record<ServiceName, CallerKey>> = {
    web: web.key,
    admin: admin.key,
    "program-service": program.key,
  };

  const dbName = `lavieco_identity${randomUUID().replace(/-/g, "").slice(0, 8)}`.replace(
    /\d/g,
    "x",
  );
  const env = identityEnvSchema.parse({
    NODE_ENV: "test",
    PORT: "4001",
    LOG_LEVEL: "info",
    MONGODB_URI: mongoUri,
    MONGODB_DB: dbName,
    SERVICE_TOKEN_TRUSTED_KEYS: JSON.stringify({
      web: web.publicJwk,
      admin: admin.publicJwk,
      "program-service": program.publicJwk,
    }),
    JWT_SIGNING_KEYS: JSON.stringify([
      { ...(await exportJWK(signing.privateKey)), kid: "id-test" },
    ]),
    TOTP_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    OTP_PEPPER: randomBytes(32).toString("base64"),
    ADMIN_APP_URL: "http://admin.test",
    WEB_APP_URL: "http://web.test",
    SMTP_HOST: "localhost",
    SMTP_PORT: "1025",
    MAIL_FROM: "test@lavieco.test",
  });

  const client = new mongo.MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  await runMigrations(db);

  const logs: string[] = [];
  const logger = createLogger({
    service: "identity-service",
    level: "debug",
    destination: new Writable({
      write(chunk, _encoding, callback) {
        logs.push(String(chunk));
        callback();
      },
    }),
  });
  const emails = new FakeEmailSender();

  const builder = Test.createTestingModule({
    imports: [
      AppModule.forRoot(env, { logger, emailSender: emails, outbox: { runWorker: false } }),
    ],
  });
  configure?.(builder);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication({ bodyParser: false, logger: false });
  configureServiceApp(app, logger);
  await app.init();

  return {
    app,
    http: () => request(app.getHttpServer()),
    emails,
    logs,
    env,
    db,
    serviceToken: async (caller, audience = "identity-service") => {
      const key = callers[caller];
      if (!key) throw new Error(`no test key for ${caller}`);
      return new SignJWT({})
        .setProtectedHeader({ alg: "EdDSA", kid: key.kid })
        .setIssuer(caller)
        .setSubject(`service:${caller}`)
        .setAudience(audience)
        .setIssuedAt()
        .setExpirationTime("1m")
        .sign(key.privateKey);
    },
    close: async () => {
      await app.close();
      await db.dropDatabase();
      await client.close();
    },
  };
}

/** Runs every due outbox job once (the worker is off in tests). */
export function drainOutbox(testApp: TestApp) {
  return testApp.app.get(OutboxWorker).drainOnce();
}
