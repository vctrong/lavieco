import { type DynamicModule, Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import type { JWK } from "jose";

import { isServiceName, type ServiceName } from "@lavieco/shared";

import { AccessGuard, TOKEN_VERIFIER } from "./access.guard";
import { TokenVerifier, type TokenVerifierOptions } from "./token-verifier";

/**
 * Parses `SERVICE_TOKEN_TRUSTED_KEYS` (`{ "<caller>": <public JWK> }`). Refuses private
 * keys: a service only ever needs its callers' PUBLIC keys (ADR-0018).
 */
export function parseTrustedServiceKeys(json: string): Partial<Record<ServiceName, JWK>> {
  const raw: unknown = JSON.parse(json);
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("SERVICE_TOKEN_TRUSTED_KEYS must be a JSON object");
  }
  const keys: Partial<Record<ServiceName, JWK>> = {};
  for (const [caller, jwk] of Object.entries(raw)) {
    if (!isServiceName(caller)) throw new Error(`Unknown service in trusted keys: ${caller}`);
    if (jwk === null || typeof jwk !== "object") throw new Error(`Invalid key for ${caller}`);
    if ("d" in jwk) throw new Error(`Trusted key for ${caller} must be public (no "d")`);
    keys[caller] = jwk as JWK;
  }
  return keys;
}

/** Registers the token verifier and the global deny-by-default access guard. */
@Global()
@Module({})
export class AuthModule {
  static forRoot(options: TokenVerifierOptions): DynamicModule {
    return {
      module: AuthModule,
      providers: [
        { provide: TOKEN_VERIFIER, useValue: new TokenVerifier(options) },
        { provide: APP_GUARD, useClass: AccessGuard },
      ],
      exports: [TOKEN_VERIFIER],
    };
  }
}
