import "server-only";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";

/**
 * Visitor IP as seen at the edge (Cloudflare sets `cf-connecting-ip`). Only passed to
 * identity-service for rate limiting, where it is hashed; never logged or stored.
 */
export async function clientIp(): Promise<string | undefined> {
  const list = await headers();
  const ip =
    list.get("cf-connecting-ip") ?? list.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  return ip && ip.length <= 64 ? ip : undefined;
}

/** `x-request-id` from the edge, or a new one, propagated to the services (docs/02 §6.1). */
export async function requestId(): Promise<string> {
  const incoming = (await headers()).get("x-request-id");
  return incoming && /^[A-Za-z0-9._-]{8,128}$/.test(incoming) ? incoming : randomUUID();
}
