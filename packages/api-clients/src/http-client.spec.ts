import { exportJWK, generateKeyPair, jwtVerify, type KeyLike } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ServiceProblemError, ServiceUnavailableError } from "./errors";
import { createHttpClient } from "./http-client";
import { createServiceTokenSigner, type ServiceTokenSigner } from "./service-token";

let signer: ServiceTokenSigner;
let publicKey: KeyLike;

beforeAll(async () => {
  const pair = await generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
  publicKey = pair.publicKey;
  const jwk = { ...(await exportJWK(pair.privateKey)), kid: "web-test" };
  signer = createServiceTokenSigner({ issuer: "web", privateJwk: JSON.stringify(jwk) });
});

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("service tokens", () => {
  it("carries the caller as iss and the target as aud", async () => {
    const token = await signer.tokenFor("identity-service");
    const { payload, protectedHeader } = await jwtVerify(token, publicKey, {
      issuer: "web",
      audience: "identity-service",
    });
    expect(protectedHeader.kid).toBe("web-test");
    expect(payload.sub).toBe("service:web");
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(60);
  });

  it("reuses a cached token for the same audience", async () => {
    expect(await signer.tokenFor("lead-service")).toBe(await signer.tokenFor("lead-service"));
  });
});

describe("createHttpClient", () => {
  it("validates the response against the schema", async () => {
    const fetchImpl = vi.fn(async () => ok({ value: 1 }));
    const client = createHttpClient({
      baseUrl: "http://svc/",
      audience: "identity-service",
      signer,
      fetchImpl,
    });
    const result = await client.call({
      method: "GET",
      path: "/x",
      auth: { kind: "service" },
      schema: z.object({ value: z.number() }),
      requestId: "req-1",
    });
    expect(result).toEqual({ value: 1 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://svc/x");
    expect((init.headers as Record<string, string>)["x-request-id"]).toBe("req-1");
  });

  it("turns Problem Details into ServiceProblemError", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            type: "t",
            title: "Invalid",
            status: 401,
            code: "auth.invalid_credentials",
          }),
          { status: 401, headers: { "content-type": "application/problem+json" } },
        ),
    );
    const client = createHttpClient({
      baseUrl: "http://svc",
      audience: "identity-service",
      signer,
      fetchImpl,
    });
    await expect(
      client.call({ method: "POST", path: "/login", auth: { kind: "service" }, body: {} }),
    ).rejects.toBeInstanceOf(ServiceProblemError);
  });

  it("never retries a non-idempotent POST", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 503 }));
    const client = createHttpClient({
      baseUrl: "http://svc",
      audience: "identity-service",
      signer,
      fetchImpl,
    });
    await expect(
      client.call({ method: "POST", path: "/p", auth: { kind: "service" }, body: {} }),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries GET on 503 then succeeds", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(ok({ value: 2 }));
    const client = createHttpClient({
      baseUrl: "http://svc",
      audience: "identity-service",
      signer,
      fetchImpl,
    });
    const result = await client.call({
      method: "GET",
      path: "/g",
      auth: { kind: "user", accessToken: "abc" },
      schema: z.object({ value: z.number() }),
    });
    expect(result).toEqual({ value: 2 });
    const init = fetchImpl.mock.calls[1]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer abc");
  });

  it("rejects a response that breaks the contract", async () => {
    const fetchImpl = vi.fn(async () => ok({ value: "nope" }));
    const client = createHttpClient({
      baseUrl: "http://svc",
      audience: "identity-service",
      signer,
      fetchImpl,
    });
    await expect(
      client.call({
        method: "GET",
        path: "/x",
        auth: { kind: "service" },
        schema: z.object({ value: z.number() }),
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});
