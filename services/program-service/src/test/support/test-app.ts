import "reflect-metadata";

import { randomBytes, randomUUID } from "node:crypto";
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

import { AppModule, type AppOverrides } from "../../app.module";
import { runMigrations } from "../../cli/migrate";
import { programEnvSchema, type ProgramEnv } from "../../config/env";

type CallerKey = { privateKey: KeyLike; kid: string };

export type TestApp = {
  app: INestApplication;
  http: () => ReturnType<typeof request>;
  logs: string[];
  env: ProgramEnv;
  db: mongo.Db;
  /** Staff access token as identity-service would sign it. */
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
 * Boots the real program-service module graph against the shared test replica set.
 * User tokens are signed with a throw-away "identity" key; the outbox worker is
 * driven manually and logs are captured to assert that no personal data is written.
 */
export async function createTestApp(
  mongoUri: string,
  overrides: Omit<AppOverrides, "logger" | "userKeyResolver"> = {},
): Promise<TestApp> {
  const identity = await generateKeyPair("EdDSA", { crv: "Ed25519" });
  const web = await callerKey("web");
  const admin = await callerKey("admin");
  const callers: Partial<Record<ServiceName, CallerKey>> = { web: web.key, admin: admin.key };

  const dbName = `lavieco_program${randomUUID().replace(/-/g, "").slice(0, 8)}`.replace(/\d/g, "x");
  const env = programEnvSchema.parse({
    NODE_ENV: "test",
    PORT: "4004",
    LOG_LEVEL: "info",
    MONGODB_URI: mongoUri,
    MONGODB_DB: dbName,
    SERVICE_TOKEN_TRUSTED_KEYS: JSON.stringify({ web: web.publicJwk, admin: admin.publicJwk }),
    IDENTITY_JWKS_URL: "http://identity.test/.well-known/jwks.json",
    WEB_APP_URL: "http://web.test",
    REVALIDATE_SECRET: randomBytes(32).toString("base64"),
  });

  const client = new mongo.MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  await runMigrations(db);

  const logs: string[] = [];
  const logger = createLogger({
    service: "program-service",
    level: "debug",
    destination: new Writable({
      write(chunk, _encoding, callback) {
        logs.push(String(chunk));
        callback();
      },
    }),
  });

  const moduleRef = await Test.createTestingModule({
    imports: [
      AppModule.forRoot(env, {
        outbox: { runWorker: false },
        ...overrides,
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
    staffToken: (roles, userId = new Types.ObjectId().toHexString()) =>
      userToken({ typ: "staff", roles, sid: randomUUID() }, TOKEN_AUDIENCES.staff, userId),
    memberToken: (userId = new Types.ObjectId().toHexString()) =>
      userToken({ typ: "member", sid: randomUUID() }, TOKEN_AUDIENCES.member, userId),
    serviceToken: async (caller, audience = "program-service") => {
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

export const bearer = (token: string) => `Bearer ${token}`;
