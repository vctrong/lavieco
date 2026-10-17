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
import { DomainError, type ServiceName } from "@lavieco/shared";
import type { EventImagePurpose } from "@lavieco/shared/media";
import { IDENTITY_ISSUER, TOKEN_AUDIENCES } from "@lavieco/shared/identity";
import type { Role } from "@lavieco/shared/permissions";

import { AppModule, type AppOverrides } from "../../app.module";
import { runMigrations } from "../../cli/migrate";
import { programEnvSchema, type ProgramEnv } from "../../config/env";
import type { MediaAttachments } from "../../modules/events";
import {
  OrderExpiryScheduler,
  PAYMENT_GATEWAY,
  type PaymentGateway,
  type PaymentLink,
  type PaymentLinkRequest,
  type PaymentStatus,
  type VerifiedPayment,
} from "../../modules/orders";
import type { EmailMessage, EmailSender } from "@lavieco/service-kit/ports";

/**
 * Stands in for content-service: knows the "uploaded" images, enforces one image per
 * event like the real attach, and records releases.
 */
export class FakeMediaAttachments implements MediaAttachments {
  private readonly uploads = new Map<string, { eventId: string | null; purpose?: string }>();
  readonly released: { mediaId: string; eventId: string }[] = [];
  unavailable = false;

  /** An image as the admin would have uploaded it: returns its media id. */
  upload(): string {
    const mediaId = new Types.ObjectId().toHexString();
    this.uploads.set(mediaId, { eventId: null });
    return mediaId;
  }

  holderOf(mediaId: string) {
    return this.uploads.get(mediaId)?.eventId ?? null;
  }

  async attach(mediaId: string, purpose: EventImagePurpose, eventId: string) {
    if (this.unavailable) throw new DomainError("common.unavailable");
    const upload = this.uploads.get(mediaId);
    if (!upload || (upload.eventId !== null && upload.eventId !== eventId)) {
      throw new DomainError("media.unavailable");
    }
    this.uploads.set(mediaId, { eventId, purpose });
    return { publicId: `lavieco/dev/events/${mediaId}`, width: 1600, height: 900 };
  }

  async release(mediaId: string, eventId: string) {
    this.released.push({ mediaId, eventId });
    this.uploads.delete(mediaId);
  }
}

/** Captures outgoing email instead of sending it. */
export class FakeEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  async send(message: EmailMessage) {
    this.sent.push(message);
  }
  to(address: string): EmailMessage[] {
    return this.sent.filter((message) => message.to === address);
  }
}

/**
 * Stands in for payOS: records links and cancellations, and lets a test decide what
 * `getStatus` answers. Webhook bodies are "signed" with a field the fake checks.
 */
export class FakePaymentGateway implements PaymentGateway {
  enabled = true;
  failNextLink = false;
  readonly links: PaymentLinkRequest[] = [];
  readonly cancelled: number[] = [];
  readonly statuses = new Map<number, PaymentStatus>();

  async createLink(request: PaymentLinkRequest): Promise<PaymentLink> {
    if (this.failNextLink) {
      this.failNextLink = false;
      throw new Error("payOS down");
    }
    this.links.push(request);
    return {
      paymentLinkId: `link-${request.orderCode}`,
      checkoutUrl: `https://pay.payos.vn/web/link-${request.orderCode}`,
      qrCode: `000201FAKEQR${request.orderCode}`,
      bin: "970422",
      accountNumber: "0123456789",
      accountName: "LAVIECO",
      description: "LAVIECO",
      expiresAt: request.expiresAt,
    };
  }

  async getStatus(orderCode: number): Promise<PaymentStatus> {
    return (
      this.statuses.get(orderCode) ?? {
        status: "PENDING",
        amountPaid: 0,
        paymentLinkId: `link-${orderCode}`,
        transactions: [],
      }
    );
  }

  async cancel(orderCode: number) {
    this.cancelled.push(orderCode);
  }

  async verifyWebhook(body: unknown): Promise<VerifiedPayment> {
    const webhook = body as { signature?: string; data?: VerifiedPayment };
    if (webhook.signature !== "valid" || !webhook.data) {
      throw new DomainError("payment.signature_invalid");
    }
    return webhook.data;
  }
}

type CallerKey = { privateKey: KeyLike; kid: string };

export type TestApp = {
  app: INestApplication;
  http: () => ReturnType<typeof request>;
  logs: string[];
  env: ProgramEnv;
  db: mongo.Db;
  media: FakeMediaAttachments;
  emails: FakeEmailSender;
  payments: FakePaymentGateway;
  /** Email proof as identity-service would sign it after an OTP (ADR-0021). */
  emailProof: (
    email: string,
    options?: { purpose?: "checkout" | "ticket_lookup"; uid?: string; id?: string },
  ) => Promise<string>;
  /** Step-up token for a staff session (ADR-0021). */
  stepUpToken: (userId: string, sessionId: string) => Promise<string>;
  /** Staff access token with a known session id (for step-up tests). */
  staffSession: (roles: Role[]) => Promise<{ token: string; userId: string; sessionId: string }>;
  expireHolds: (now?: Date) => Promise<number>;
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
  overrides: Omit<AppOverrides, "logger" | "userKeyResolver" | "emailSender"> = {},
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
    CONTENT_SERVICE_URL: "http://content.test",
    SERVICE_TOKEN_PRIVATE_JWK: "unused-in-tests",
    TICKET_LINK_SECRET: randomBytes(32).toString("base64"),
    SMTP_HOST: "localhost",
    SMTP_PORT: "1025",
    MAIL_FROM: "test@lavieco.test",
  });
  const media = new FakeMediaAttachments();
  const emails = new FakeEmailSender();
  const payments = new FakePaymentGateway();

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
        mediaAttachments: media,
        paymentGateway: { provide: PAYMENT_GATEWAY, useValue: payments },
        runOrderExpiry: false,
        ...overrides,
        emailSender: emails,
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
    media,
    emails,
    payments,
    emailProof: (email, options = {}) =>
      userToken(
        {
          email: email.trim().toLowerCase(),
          purpose: options.purpose ?? "checkout",
          ...(options.uid ? { uid: options.uid } : {}),
        },
        TOKEN_AUDIENCES.emailVerification,
        options.id ?? randomBytes(16).toString("base64url"),
      ),
    stepUpToken: (userId, sessionId) =>
      userToken({ sid: sessionId }, TOKEN_AUDIENCES.stepUp, userId),
    staffSession: async (roles) => {
      const userId = new Types.ObjectId().toHexString();
      const sessionId = randomUUID();
      const token = await userToken(
        { typ: "staff", roles, sid: sessionId },
        TOKEN_AUDIENCES.staff,
        userId,
      );
      return { token, userId, sessionId };
    },
    expireHolds: (now) => app.get(OrderExpiryScheduler).runOnce(now),
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
