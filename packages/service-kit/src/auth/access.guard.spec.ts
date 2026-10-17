import "reflect-metadata";

import { Controller, Get, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWK,
  type KeyLike,
} from "jose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createLogger } from "@lavieco/observability";
import { IDENTITY_ISSUER, TOKEN_AUDIENCES } from "@lavieco/shared/identity";

import { configureServiceApp } from "../bootstrap/configure-app";
import { LoggingModule } from "../logging/logging.module";
import {
  AllowServices,
  CurrentPrincipal,
  PublicEndpoint,
  RequireMember,
  RequirePermission,
} from "./access.decorators";
import { AuthModule, parseTrustedServiceKeys } from "./auth.module";
import type { Principal } from "./principal";

@Controller("t")
class TestController {
  @Get("public")
  @PublicEndpoint()
  open() {
    return { ok: true };
  }

  @Get("undeclared")
  undeclared() {
    return { ok: true };
  }

  @Get("from-web")
  @AllowServices("web")
  fromWeb(@CurrentPrincipal() principal: Principal) {
    return principal;
  }

  @Get("leads")
  @RequirePermission("lead:export")
  leads(@CurrentPrincipal() principal: Principal) {
    return { kind: principal.kind };
  }

  @Get("me")
  @RequireMember()
  me(@CurrentPrincipal() principal: Principal) {
    return principal;
  }
}

type Pair = { privateKey: KeyLike; publicJwk: JWK };

async function keyPair(kid: string): Promise<Pair> {
  const { privateKey, publicKey } = await generateKeyPair("EdDSA", { crv: "Ed25519" });
  return { privateKey, publicJwk: { ...(await exportJWK(publicKey)), kid, alg: "EdDSA" } };
}

function sign(
  key: Pair,
  claims: Record<string, unknown>,
  opts: { iss: string; aud: string; kid: string },
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "EdDSA", kid: opts.kid })
    .setIssuer(opts.iss)
    .setAudience(opts.aud)
    .setSubject(String(claims.sub ?? "service:x"))
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key.privateKey);
}

let app: INestApplication;
let identityKey: Pair;
let webKey: Pair;
let adminKey: Pair;

beforeAll(async () => {
  identityKey = await keyPair("id-1");
  webKey = await keyPair("web-1");
  adminKey = await keyPair("admin-1");
  const logger = createLogger({ service: "test", level: "silent" });

  const moduleRef = await Test.createTestingModule({
    imports: [
      LoggingModule.forRoot({ service: "test", logger }),
      AuthModule.forRoot({
        serviceName: "identity-service",
        userKeys: { resolver: createLocalJWKSet({ keys: [identityKey.publicJwk] }) },
        trustedServiceKeys: parseTrustedServiceKeys(
          JSON.stringify({ web: webKey.publicJwk, admin: adminKey.publicJwk }),
        ),
      }),
    ],
    controllers: [TestController],
  }).compile();

  app = moduleRef.createNestApplication({ bodyParser: false });
  configureServiceApp(app, logger);
  await app.init();
});

afterAll(async () => {
  await app.close();
});

const staffToken = (roles: string[]) =>
  sign(
    identityKey,
    { sub: "a".repeat(24), typ: "staff", roles, sid: "s1" },
    {
      iss: IDENTITY_ISSUER,
      aud: TOKEN_AUDIENCES.staff,
      kid: "id-1",
    },
  );

const memberToken = () =>
  sign(
    identityKey,
    { sub: "b".repeat(24), typ: "member", sid: "s2" },
    {
      iss: IDENTITY_ISSUER,
      aud: TOKEN_AUDIENCES.member,
      kid: "id-1",
    },
  );

describe("AccessGuard", () => {
  it("lets public routes through without a token", async () => {
    await request(app.getHttpServer()).get("/t/public").expect(200);
  });

  it("refuses a route that declares no access rule (deny by default)", async () => {
    const res = await request(app.getHttpServer()).get("/t/undeclared").expect(403);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.body.code).toBe("common.forbidden");
  });

  it("answers 401 Problem Details without a token, with a request id", async () => {
    const res = await request(app.getHttpServer()).get("/t/from-web").expect(401);
    expect(res.body).toMatchObject({ status: 401, code: "common.unauthenticated" });
    expect(res.body.traceId).toBe(res.headers["x-request-id"]);
  });

  it("accepts a service token from an allowed caller aimed at this service", async () => {
    const token = await sign(webKey, {}, { iss: "web", aud: "identity-service", kid: "web-1" });
    const res = await request(app.getHttpServer())
      .get("/t/from-web")
      .set("authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toEqual({ kind: "service", name: "web" });
  });

  it("rejects a service token whose aud is another service", async () => {
    const token = await sign(webKey, {}, { iss: "web", aud: "lead-service", kid: "web-1" });
    await request(app.getHttpServer())
      .get("/t/from-web")
      .set("authorization", `Bearer ${token}`)
      .expect(401);
  });

  it("rejects a known caller that is not allowed on this route", async () => {
    const token = await sign(
      adminKey,
      {},
      { iss: "admin", aud: "identity-service", kid: "admin-1" },
    );
    await request(app.getHttpServer())
      .get("/t/from-web")
      .set("authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("rejects a token claiming to be web but signed with another key", async () => {
    const token = await sign(adminKey, {}, { iss: "web", aud: "identity-service", kid: "web-1" });
    await request(app.getHttpServer())
      .get("/t/from-web")
      .set("authorization", `Bearer ${token}`)
      .expect(401);
  });

  it("checks permissions, not role names", async () => {
    const coordinator = await staffToken(["coordinator"]);
    const editor = await staffToken(["content_editor"]);
    await request(app.getHttpServer())
      .get("/t/leads")
      .set("authorization", `Bearer ${coordinator}`)
      .expect(200);
    await request(app.getHttpServer())
      .get("/t/leads")
      .set("authorization", `Bearer ${editor}`)
      .expect(403);
  });

  it("never accepts a member token where a permission is required", async () => {
    await request(app.getHttpServer())
      .get("/t/leads")
      .set("authorization", `Bearer ${await memberToken()}`)
      .expect(401);
  });

  it("never accepts a staff token where a member is required", async () => {
    await request(app.getHttpServer())
      .get("/t/me")
      .set("authorization", `Bearer ${await staffToken(["super_admin"])}`)
      .expect(401);
    const res = await request(app.getHttpServer())
      .get("/t/me")
      .set("authorization", `Bearer ${await memberToken()}`)
      .expect(200);
    expect(res.body).toMatchObject({ kind: "member", userId: "b".repeat(24) });
  });

  it("refuses a private key in the trusted keys", () => {
    expect(() =>
      parseTrustedServiceKeys(JSON.stringify({ web: { kty: "OKP", d: "x" } })),
    ).toThrow();
  });
});
