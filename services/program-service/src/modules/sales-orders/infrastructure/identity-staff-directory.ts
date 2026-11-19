import { createIdentityClient, createServiceTokenSigner } from "@lavieco/api-clients";
import type { StaffRef } from "@lavieco/shared/sales";

import type { StaffDirectory } from "../application/ports";

const CACHE_MS = 60_000;

/**
 * identity-service `GET /internal/v1/staff-directory` with program-service's own token.
 * Cached a minute: a handful of accounts that rarely change, read on every save.
 */
export function createIdentityStaffDirectory(options: {
  identityServiceUrl: string;
  privateJwk: string;
}): StaffDirectory {
  const client = createIdentityClient({
    baseUrl: options.identityServiceUrl,
    signer: createServiceTokenSigner({ issuer: "program-service", privateJwk: options.privateJwk }),
  });
  let cached: { at: number; items: StaffRef[] } | null = null;
  return {
    async list() {
      if (cached && Date.now() - cached.at < CACHE_MS) return cached.items;
      const { items } = await client.listStaffDirectory();
      cached = { at: Date.now(), items };
      return items;
    },
  };
}
