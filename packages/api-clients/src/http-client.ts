import type { z } from "zod";

import { PROBLEM_CONTENT_TYPE, problemDetailsSchema, type ServiceName } from "@lavieco/shared";

import { ServiceProblemError, ServiceUnavailableError } from "./errors";
import type { ServiceTokenSigner } from "./service-token";

/** Who the call is made for: the calling app itself, or a signed-in user. */
export type CallAuth = { kind: "service" } | { kind: "user"; accessToken: string };

export type CallOptions<TSchema extends z.ZodType | undefined> = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  auth: CallAuth;
  body?: unknown;
  /** Response schema; omit for `204 No Content`. */
  schema?: TSchema;
  /** Safe to retry: GET, or a POST carrying an Idempotency-Key (docs/02 §6.1). */
  idempotent?: boolean;
  idempotencyKey?: string;
  requestId?: string;
};

export type HttpClientOptions = {
  baseUrl: string;
  /** Name of the target service: the `aud` of service tokens. */
  audience: ServiceName;
  signer: ServiceTokenSigner;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
};

export type HttpClient = {
  call<TSchema extends z.ZodType | undefined = undefined>(
    options: CallOptions<TSchema>,
  ): Promise<TSchema extends z.ZodType ? z.output<TSchema> : void>;
};

const RETRYABLE_STATUS = new Set([502, 503, 504]);

/**
 * Minimal typed HTTP client: explicit timeout, retries with backoff only for
 * idempotent calls, `x-request-id` propagation, Problem Details parsing, and
 * response validation against the shared schema (docs/04 §4.2).
 */
export function createHttpClient({
  baseUrl,
  audience,
  signer,
  timeoutMs = 5_000,
  retries = 2,
  fetchImpl = fetch,
}: HttpClientOptions): HttpClient {
  const root = baseUrl.replace(/\/+$/, "");

  async function attempt(options: CallOptions<z.ZodType | undefined>): Promise<Response> {
    const headers: Record<string, string> = { accept: "application/json" };
    headers.authorization =
      options.auth.kind === "service"
        ? `Bearer ${await signer.tokenFor(audience)}`
        : `Bearer ${options.auth.accessToken}`;
    if (options.body !== undefined) headers["content-type"] = "application/json";
    if (options.requestId) headers["x-request-id"] = options.requestId;
    if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;

    return fetchImpl(`${root}${options.path}`, {
      method: options.method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  }

  async function call(options: CallOptions<z.ZodType | undefined>): Promise<unknown> {
    const canRetry = options.method === "GET" || options.idempotent === true;
    const maxAttempts = canRetry ? retries + 1 : 1;
    let lastError: unknown;

    for (let index = 0; index < maxAttempts; index += 1) {
      if (index > 0) await sleep(100 * 2 ** (index - 1));
      let response: Response;
      try {
        response = await attempt(options);
      } catch (error) {
        lastError = error;
        continue;
      }
      if (RETRYABLE_STATUS.has(response.status) && index < maxAttempts - 1) {
        lastError = new Error(`status ${response.status}`);
        continue;
      }
      return readResponse(response, options.schema);
    }
    throw new ServiceUnavailableError(
      `${audience} unreachable: ${options.method} ${options.path}`,
      {
        cause: lastError,
      },
    );
  }

  return { call: call as HttpClient["call"] };
}

async function readResponse(response: Response, schema: z.ZodType | undefined): Promise<unknown> {
  if (!response.ok) {
    const type = response.headers.get("content-type") ?? "";
    if (type.includes(PROBLEM_CONTENT_TYPE) || type.includes("application/json")) {
      const parsed = problemDetailsSchema.safeParse(await response.json().catch(() => null));
      if (parsed.success) throw new ServiceProblemError(parsed.data);
    }
    throw new ServiceUnavailableError(`unexpected status ${response.status}`);
  }
  if (!schema || response.status === 204) return undefined;
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new ServiceUnavailableError("response does not match the contract", {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
