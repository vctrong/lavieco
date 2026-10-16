import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

import type {
  GoogleIdentity,
  GoogleIdentityProvider,
} from "../application/ports/google-identity.port";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

const tokenResponseSchema = z.object({ id_token: z.string() });
const idTokenClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  email_verified: z.boolean(),
  name: z.string().optional(),
});

export type GoogleOAuthConfig = { clientId: string; clientSecret: string; redirectUri: string };

/**
 * Server-side half of Google sign-in. The client secret never leaves this service;
 * the redirect URI must be exactly the configured one (no open redirect).
 */
export class GoogleOAuthClient implements GoogleIdentityProvider {
  private readonly jwks = createRemoteJWKSet(new URL(JWKS_URL));

  constructor(private readonly config: GoogleOAuthConfig) {}

  get enabled(): boolean {
    return Boolean(this.config.clientId && this.config.clientSecret && this.config.redirectUri);
  }

  async exchange(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<GoogleIdentity> {
    if (input.redirectUri !== this.config.redirectUri) throw new Error("redirect_uri mismatch");
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: input.code,
        code_verifier: input.codeVerifier,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`token endpoint ${response.status}`);
    const { id_token } = tokenResponseSchema.parse(await response.json());

    const { payload } = await jwtVerify(id_token, this.jwks, {
      issuer: ISSUERS,
      audience: this.config.clientId,
    });
    const claims = idTokenClaimsSchema.parse(payload);
    return {
      sub: claims.sub,
      email: claims.email,
      emailVerified: claims.email_verified,
      name: claims.name ?? null,
    };
  }
}
