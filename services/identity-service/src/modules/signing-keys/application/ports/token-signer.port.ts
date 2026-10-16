export const TOKEN_SIGNER = Symbol("TOKEN_SIGNER");

export type SignInput = {
  audience: string;
  subject: string;
  ttlSeconds: number;
  claims?: Record<string, unknown>;
};

/** Signs and verifies the tokens identity-service issues itself (EdDSA). */
export interface TokenSigner {
  sign(input: SignInput, now?: Date): Promise<{ token: string; expiresAt: Date }>;
  /** Verifies a token this service issued for `audience`; throws on any problem. */
  verify(token: string, audience: string): Promise<Record<string, unknown> & { sub: string }>;
}
