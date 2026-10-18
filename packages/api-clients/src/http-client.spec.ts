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

  it("retries an idempotent POST (order cancel) while the service restarts", async () => {
    const refused = new TypeError("fetch failed", { cause: new Error("ECONNREFUSED") });
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(refused)
      .mockResolvedValueOnce(ok({ status: "cancelled" }));
    const client = createHttpClient({
      baseUrl: "http://svc",
      audience: "program-service",
      signer,
      fetchImpl,
    });
    const result = await client.call({
      method: "POST",
      path: "/internal/v1/order-links/t/cancel",
      auth: { kind: "service" },
      idempotent: true,
      schema: z.object({ status: z.string() }),
    });
    expect(result).toEqual({ status: "cancelled" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("gives up as unreachable when every attempt is refused", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
    const client = createHttpClient({
      baseUrl: "http://svc",
      audience: "program-service",
      signer,
      fetchImpl,
    });
    await expect(
      client.call({
        method: "POST",
        path: "/internal/v1/order-links/t/cancel",
        auth: { kind: "service" },
        idempotent: true,
      }),
    ).rejects.toThrow(/unreachable/);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
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

describe("raw bodies, extra headers and downloads", () => {
  it("sends a raw JSON body byte for byte with extra headers", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      ok({ received: true }),
    );
    const client = createHttpClient({
      baseUrl: "http://svc",
      audience: "program-service",
      signer,
      fetchImpl,
    });
    const raw = '{"data":{"amount":1000,"orderCode":1},"signature":"x"}';
    await client.call({
      method: "POST",
      path: "/hook",
      auth: { kind: "service" },
      rawJson: raw,
      headers: { "x-step-up-token": "t" },
      schema: z.object({ received: z.literal(true) }),
    });
    const init = fetchImpl.mock.calls[0]![1]!;
    expect(init.body).toBe(raw);
    expect((init.headers as Record<string, string>)["x-step-up-token"]).toBe("t");
  });

  it("downloads a file with its name, and turns errors into Problem Details", async () => {
    const file = new Response(new Uint8Array([1, 2, 3]), {
      headers: {
        "content-type": "application/vnd.ms-excel",
        "content-disposition": 'attachment; filename="LAVIECO_x_2026-10-20.xlsx"',
      },
    });
    const client = createHttpClient({
      baseUrl: "http://svc",
      audience: "program-service",
      signer,
      fetchImpl: vi.fn(async () => file),
    });
    const downloaded = await client.download({ path: "/f", auth: { kind: "service" } });
    expect(downloaded.fileName).toBe("LAVIECO_x_2026-10-20.xlsx");
    expect(new Uint8Array(downloaded.body)).toEqual(new Uint8Array([1, 2, 3]));

    const failing = createHttpClient({
      baseUrl: "http://svc",
      audience: "program-service",
      signer,
      fetchImpl: vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              type: "t",
              title: "x",
              status: 403,
              code: "auth.step_up_required",
            }),
            { status: 403, headers: { "content-type": "application/problem+json" } },
          ),
      ),
    });
    await expect(
      failing.download({ path: "/f", auth: { kind: "service" } }),
    ).rejects.toBeInstanceOf(ServiceProblemError);
  });
});
