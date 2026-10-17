import "server-only";

import {
  createContentClient,
  createIdentityClient,
  createProgramClient,
  createServiceTokenSigner,
  type ContentClient,
  type IdentityClient,
  type ProgramClient,
  type ServiceTokenSigner,
} from "@lavieco/api-clients";
import { createLogger, type Logger } from "@lavieco/observability";

import { serverEnv } from "./env";

let identity: IdentityClient | null = null;
let program: ProgramClient | null = null;
let content: ContentClient | null = null;
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

/** content-service client: avatar calls carry the member's access token (ADR-0020). */
export function contentClient(): ContentClient {
  content ??= createContentClient({
    baseUrl: serverEnv().CONTENT_SERVICE_URL,
    signer: webSigner(),
  });
  return content;
}

/** Server logger of `web`; personal data is masked by `@lavieco/observability`. */
export function webLogger(): Logger {
  logger ??= createLogger({ service: "web", level: serverEnv().LOG_LEVEL });
  return logger;
}
