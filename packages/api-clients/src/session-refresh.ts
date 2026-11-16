import type { TokenPair } from "@lavieco/shared/identity";

export type SessionRefresher = (refreshToken: string, requestId?: string) => Promise<TokenPair>;

export type SessionRefresherOptions = {
  /** How long the answer for one refresh token is handed to later callers. */
  reuseMs?: number;
  now?: () => number;
};

type Entry = { promise: Promise<TokenPair>; settledAt: number | null };

/** Long enough for a second tab or a parallel action, far shorter than any access token. */
const DEFAULT_REUSE_MS = 30_000;

/**
 * Wraps the identity-service refresh so that one refresh token is rotated only once.
 *
 * identity-service treats a second use of a refresh token as theft and revokes the whole
 * session family (docs/02 §9.2). Two Server Actions in flight, or two tabs waking up after
 * a break, would otherwise sign the user out everywhere. Callers holding the same old token
 * share the first call and, for `reuseMs` after it, its result. A failure is not kept, so a
 * dropped connection can be retried on the next call.
 *
 * Process-local: correct for one BFF instance (docs/02 §12, AQ1). With several instances,
 * a race between two of them still ends in a revoked family, as it does today.
 */
export function createSessionRefresher(
  refresh: SessionRefresher,
  options: SessionRefresherOptions = {},
): SessionRefresher {
  const reuseMs = options.reuseMs ?? DEFAULT_REUSE_MS;
  const now = options.now ?? Date.now;
  const entries = new Map<string, Entry>();

  const prune = () => {
    const limit = now() - reuseMs;
    for (const [token, entry] of entries) {
      if (entry.settledAt !== null && entry.settledAt < limit) entries.delete(token);
    }
  };

  return (refreshToken, requestId) => {
    prune();
    const known = entries.get(refreshToken);
    if (known) return known.promise;

    const promise = refresh(refreshToken, requestId).then(
      (tokens) => {
        const entry = entries.get(refreshToken);
        if (entry) entry.settledAt = now();
        return tokens;
      },
      (error: unknown) => {
        entries.delete(refreshToken);
        throw error;
      },
    );
    entries.set(refreshToken, { promise, settledAt: null });
    return promise;
  };
}
