import "server-only";

import {
  createIdentityClient,
  createServiceTokenSigner,
  type IdentityClient,
} from "@lavieco/api-clients";
import { createLogger, type Logger } from "@lavieco/observability";

import { serverEnv } from "./env";

let identity: IdentityClient | null = null;
let logger: Logger | null = null;

/** identity-service client, signing service tokens as `admin` (docs/02 §6.3). */
export function identityClient(): IdentityClient {
  if (identity) return identity;
  const env = serverEnv();
  identity = createIdentityClient({
    baseUrl: env.IDENTITY_SERVICE_URL,
    signer: createServiceTokenSigner({
      issuer: "admin",
      privateJwk: env.SERVICE_TOKEN_PRIVATE_JWK,
    }),
  });
  return identity;
}

export function adminLogger(): Logger {
  logger ??= createLogger({ service: "admin", level: serverEnv().LOG_LEVEL });
  return logger;
}
