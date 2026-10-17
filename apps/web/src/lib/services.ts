import "server-only";

import {
  createIdentityClient,
  createProgramClient,
  createServiceTokenSigner,
  type IdentityClient,
  type ProgramClient,
  type ServiceTokenSigner,
} from "@lavieco/api-clients";
import { createLogger, type Logger } from "@lavieco/observability";

import { serverEnv } from "./env";

let identity: IdentityClient | null = null;
let program: ProgramClient | null = null;
let signer: ServiceTokenSigner | null = null;
let logger: Logger | null = null;

/** Service tokens signed as `web` (docs/02 §6.3, ADR-0018). */
function webSigner(): ServiceTokenSigner {
  signer ??= createServiceTokenSigner({
    issuer: "web",
    privateJwk: serverEnv().SERVICE_TOKEN_PRIVATE_JWK,
  });
  return signer;
}

/** identity-service client. */
export function identityClient(): IdentityClient {
  identity ??= createIdentityClient({
    baseUrl: serverEnv().IDENTITY_SERVICE_URL,
    signer: webSigner(),
  });
  return identity;
}

/** program-service client (published events, previews). */
export function programClient(): ProgramClient {
  program ??= createProgramClient({
    baseUrl: serverEnv().PROGRAM_SERVICE_URL,
    signer: webSigner(),
  });
  return program;
}

/** Server logger of `web`; personal data is masked by `@lavieco/observability`. */
export function webLogger(): Logger {
  logger ??= createLogger({ service: "web", level: serverEnv().LOG_LEVEL });
  return logger;
}
