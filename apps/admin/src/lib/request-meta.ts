import "server-only";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";

/** `x-request-id` from the edge, or a new one, propagated to the services (docs/02 §6.1). */
export async function requestId(): Promise<string> {
  const incoming = (await headers()).get("x-request-id");
  return incoming && /^[A-Za-z0-9._-]{8,128}$/.test(incoming) ? incoming : randomUUID();
}
