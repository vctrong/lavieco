export const PREVIEW_TOKEN_REPOSITORY = Symbol("PREVIEW_TOKEN_REPOSITORY");

/** Short-lived preview links (`preview_tokens`); only the hash of a token is stored. */
export interface PreviewTokenRepository {
  insert(input: {
    tokenHash: string;
    eventId: string;
    createdBy: string;
    expiresAt: Date;
  }): Promise<void>;
  /** Event id of a token that has not expired yet. */
  findEventId(tokenHash: string, now: Date): Promise<string | null>;
}
