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

/** identity-service client, signing service tokens as `web` (docs/02 §6.3). */
export function identityClient(): IdentityClient {
  if (identity) return identity;
  const env = serverEnv();
  identity = createIdentityClient({
    baseUrl: env.IDENTITY_SERVICE_URL,
    signer: createServiceTokenSigner({ issuer: "web", privateJwk: env.SERVICE_TOKEN_PRIVATE_JWK }),
  });
  return identity;
}

/** Server logger of `web`; personal data is masked by `@lavieco/observability`. */
export function webLogger(): Logger {
  logger ??= createLogger({ service: "web", level: serverEnv().LOG_LEVEL });
  return logger;
}
