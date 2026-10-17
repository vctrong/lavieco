import { SignJWT, importJWK, type JWK, type KeyLike } from "jose";

import type { ServiceName } from "@lavieco/shared";

/** Lifetime of a service token (docs/02 §6.3: short-lived). */
export const SERVICE_TOKEN_TTL_SECONDS = 60;
const REFRESH_MARGIN_SECONDS = 10;

export interface ServiceTokenSigner {
  readonly issuer: ServiceName;
  /** A token whose `aud` is the target service; cached until shortly before expiry. */
  tokenFor(audience: ServiceName): Promise<string>;
}

export type ServiceTokenSignerOptions = {
  issuer: ServiceName;
  /** Private Ed25519 JWK of the caller, as JSON (must carry a `kid`). Never logged. */
  privateJwk: string;
  now?: () => number;
};

/**
 * Signs service tokens with the CALLER's own key: `iss` = caller, `aud` = target.
 * The target trusts the caller's public key from its configuration (ADR-0018).
 */
export function createServiceTokenSigner({
  issuer,
  privateJwk,
  now = () => Date.now(),
}: ServiceTokenSignerOptions): ServiceTokenSigner {
  const jwk = JSON.parse(privateJwk) as JWK;
  if (!jwk.kid) throw new Error("Service signing key must carry a kid");
  const kid = jwk.kid;
  let keyPromise: Promise<KeyLike | Uint8Array> | null = null;
  const cache = new Map<ServiceName, { token: string; expiresAt: number }>();

  return {
    issuer,
    async tokenFor(audience) {
      const nowSeconds = Math.floor(now() / 1000);
      const cached = cache.get(audience);
      if (cached && cached.expiresAt - REFRESH_MARGIN_SECONDS > nowSeconds) return cached.token;

      keyPromise ??= importJWK(jwk, "EdDSA");
      const key = await keyPromise;
      const expiresAt = nowSeconds + SERVICE_TOKEN_TTL_SECONDS;
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: "EdDSA", kid, typ: "JWT" })
        .setIssuer(issuer)
        .setSubject(`service:${issuer}`)
        .setAudience(audience)
        .setIssuedAt(nowSeconds)
        .setExpirationTime(expiresAt)
        .sign(key);
      cache.set(audience, { token, expiresAt });
      return token;
    },
  };
}
