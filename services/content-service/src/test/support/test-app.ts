import "reflect-metadata";

import { randomUUID } from "node:crypto";
import { Writable } from "node:stream";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { SignJWT, exportJWK, generateKeyPair, type KeyLike } from "jose";
import { Types, mongo } from "mongoose";
import request from "supertest";

import { createLogger } from "@lavieco/observability";
import { OutboxWorker, configureServiceApp } from "@lavieco/service-kit";
import type { ServiceName } from "@lavieco/shared";
import { IDENTITY_ISSUER, TOKEN_AUDIENCES } from "@lavieco/shared/identity";
import type { Role } from "@lavieco/shared/permissions";

import { AppModule } from "../../app.module";
import { runMigrations } from "../../cli/migrate";
import { contentEnvSchema, type ContentEnv } from "../../config/env";
import { MediaStorageError, PendingMediaSweeper, type MediaStorage } from "../../modules/media";

type CallerKey = { privateKey: KeyLike; kid: string };

/** In-memory stand-in for Cloudinary: records exactly what would have been stored. */
export class FakeMediaStorage implements MediaStorage {
  readonly files = new Map<string, Buffer>();
  failUploads = false;

  async upload({ publicId, bytes }: { publicId: string; bytes: Uint8Array }) {
    if (this.failUploads) throw new MediaStorageError("upload failed (503)");
    if (this.files.has(publicId)) throw new MediaStorageError("exists");
    this.files.set(publicId, Buffer.from(bytes));
  }

  async destroy(publicId: string) {
    this.files.delete(publicId);
  }
}

export type TestApp = {
  app: INestApplication;
  http: () => ReturnType<typeof request>;
  logs: string[];
  env: ContentEnv;
  db: mongo.Db;
  storage: FakeMediaStorage;
  staffToken: (roles: Role[], userId?: string) => Promise<string>;
  memberToken: (userId?: string) => Promise<string>;
  serviceToken: (caller: ServiceName, audience?: ServiceName) => Promise<string>;
  close: () => Promise<void>;
};

async function callerKey(name: string) {
  const { privateKey, publicKey } = await generateKeyPair("EdDSA", { crv: "Ed25519" });
  const kid = `${name}-test`;
  return { key: { privateKey, kid }, publicJwk: { ...(await exportJWK(publicKey)), kid } };
}

/**
 * Boots the real content-service module graph against the shared test replica set,
 * with images stored in memory. The outbox worker and the pending sweep are driven
 * manually; logs are captured to assert that no personal data or secret is written.
 */
export async function createTestApp(mongoUri: string): Promise<TestApp> {
  const identity = await generateKeyPair("EdDSA", { crv: "Ed25519" });
  const keys = {
    web: await callerKey("web"),
    admin: await callerKey("admin"),
    "program-service": await callerKey("program-service"),
    "identity-service": await callerKey("identity-service"),
  };
  const callers: Partial<Record<ServiceName, CallerKey>> = Object.fromEntries(
    Object.entries(keys).map(([name, value]) => [name, value.key]),
  );

  const dbName = `lavieco_content${randomUUID().replace(/-/g, "").slice(0, 8)}`.replace(/\d/g, "x");
  const env = contentEnvSchema.parse({
    NODE_ENV: "test",
    PORT: "4002",
    LOG_LEVEL: "info",
    MONGODB_URI: mongoUri,
    MONGODB_DB: dbName,
    SERVICE_TOKEN_TRUSTED_KEYS: JSON.stringify(
      Object.fromEntries(Object.entries(keys).map(([name, value]) => [name, value.publicJwk])),
    ),
    IDENTITY_JWKS_URL: "http://identity.test/.well-known/jwks.json",
    CLOUDINARY_CLOUD_NAME: "test-cloud",
    CLOUDINARY_API_KEY: "test-key",
    CLOUDINARY_API_SECRET: "test-secret-never-logged",
  });

  const client = new mongo.MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  await runMigrations(db);

  const logs: string[] = [];
  const logger = createLogger({
    service: "content-service",
    level: "debug",
    destination: new Writable({
      write(chunk, _encoding, callback) {
        logs.push(String(chunk));
        callback();
      },
    }),
  });

  const storage = new FakeMediaStorage();
  const moduleRef = await Test.createTestingModule({
    imports: [
      AppModule.forRoot(env, {
        outbox: { runWorker: false },
        runMediaSweeper: false,
        mediaStorage: storage,
        logger,
        userKeyResolver: async () => identity.publicKey,
      }),
    ],
  }).compile();
  const app = moduleRef.createNestApplication({ bodyParser: false, logger: false });
  configureServiceApp(app, logger);
  await app.init();

  const userToken = (claims: Record<string, unknown>, audience: string, userId: string) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "EdDSA", kid: "id-test" })
      .setIssuer(IDENTITY_ISSUER)
      .setAudience(audience)
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(identity.privateKey);

  return {
    app,
    http: () => request(app.getHttpServer()),
    logs,
    env,
    db,
    storage,
    staffToken: (roles, userId = new Types.ObjectId().toHexString()) =>
      userToken({ typ: "staff", roles, sid: randomUUID() }, TOKEN_AUDIENCES.staff, userId),
    memberToken: (userId = new Types.ObjectId().toHexString()) =>
      userToken({ typ: "member", sid: randomUUID() }, TOKEN_AUDIENCES.member, userId),
    serviceToken: async (caller, audience = "content-service") => {
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

export function sweepPending(testApp: TestApp, now?: Date) {
  return testApp.app.get(PendingMediaSweeper).sweepOnce(now);
}

export const bearer = (token: string) => `Bearer ${token}`;
