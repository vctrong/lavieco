export const HANDBOOK_PREVIEW_TOKENS = Symbol("HANDBOOK_PREVIEW_TOKENS");

/** Short-lived preview links of the draft; only the hash of a token is stored. */
export interface HandbookPreviewTokenRepository {
  insert(input: {
    tokenHash: string;
    versionId: string;
    createdBy: string;
    expiresAt: Date;
  }): Promise<void>;
  /** Version id of a token that has not expired yet. */
  findVersionId(tokenHash: string, now: Date): Promise<string | null>;
}
