import { randomUUID } from "node:crypto";

import {
  SignJWT,
  createLocalJWKSet,
  importJWK,
  jwtVerify,
  type JWK,
  type JWTVerifyGetKey,
  type KeyLike,
} from "jose";

import { IDENTITY_ISSUER } from "@lavieco/shared/identity";

import type { SignInput, TokenSigner } from "../application/ports/token-signer.port";

type PrivateKeyEntry = { kid: string; jwk: JWK };

/**
 * Ed25519 keys from `JWT_SIGNING_KEYS` (a JSON array of private JWKs; the first one
 * signs). Keys live in the secret store, not in MongoDB (CLAUDE §10). Rotation: put
 * the new key first, keep the old one listed until every token it signed expired.
 */
export class SigningKeyStore implements TokenSigner {
  private readonly entries: PrivateKeyEntry[];
  private readonly publicJwks: JWK[];
  private readonly jwks: JWTVerifyGetKey;
  private signingKey: Promise<KeyLike | Uint8Array> | null = null;

  constructor(json: string) {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("JWT_SIGNING_KEYS must be a non-empty JSON array");
    }
    this.entries = parsed.map((raw: JWK) => {
      if (raw.kty !== "OKP" || raw.crv !== "Ed25519" || !raw.d || !raw.kid) {
        throw new Error("Each signing key must be a private Ed25519 JWK with a kid");
      }
      return { kid: raw.kid, jwk: raw };
    });
    this.publicJwks = this.entries.map(({ kid, jwk }) => ({
      kty: jwk.kty,
      crv: jwk.crv,
      x: jwk.x,
      kid,
      alg: "EdDSA",
      use: "sig",
    }));
    this.jwks = createLocalJWKSet({ keys: this.publicJwks });
  }

  get currentKid(): string {
    return this.entries[0]!.kid;
  }

  /** Public half of every key, served at `/.well-known/jwks.json`. */
  publicKeySet(): { keys: JWK[] } {
    return { keys: this.publicJwks };
  }

  /** Key resolver for the local token verifier (identity verifies its own tokens). */
  resolver(): JWTVerifyGetKey {
    return this.jwks;
  }

  async sign(input: SignInput, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
    this.signingKey ??= importJWK(this.entries[0]!.jwk, "EdDSA");
    const issuedAt = Math.floor(now.getTime() / 1000);
    const expiresAt = issuedAt + input.ttlSeconds;
    const token = await new SignJWT(input.claims ?? {})
      .setProtectedHeader({ alg: "EdDSA", kid: this.currentKid, typ: "JWT" })
      .setIssuer(IDENTITY_ISSUER)
      .setAudience(input.audience)
      .setSubject(input.subject)
      .setJti(randomUUID())
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(await this.signingKey);
    return { token, expiresAt: new Date(expiresAt * 1000) };
  }

  async verify(token: string, audience: string) {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: IDENTITY_ISSUER,
      audience,
      algorithms: ["EdDSA"],
      clockTolerance: 5,
    });
    if (typeof payload.sub !== "string") throw new Error("Token without subject");
    return payload as Record<string, unknown> & { sub: string };
  }
}
