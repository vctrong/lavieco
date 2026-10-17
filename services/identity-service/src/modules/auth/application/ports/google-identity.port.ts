export const GOOGLE_IDENTITY = Symbol("GOOGLE_IDENTITY");

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

/** Authorization-code exchange + ID token verification with Google (ADR-0016). */
export interface GoogleIdentityProvider {
  readonly enabled: boolean;
  /** Throws on any failure; the caller maps it to `member.google_failed`. */
  exchange(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<GoogleIdentity>;
}
