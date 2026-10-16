import "server-only";

import { serverEnv } from "./env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Site key for the widget, or null while Turnstile is switched off. */
export function turnstileSiteKey(): string | null {
  const env = serverEnv();
  return env.TURNSTILE_ENABLED && env.TURNSTILE_SITE_KEY ? env.TURNSTILE_SITE_KEY : null;
}

/**
 * Server-side Turnstile check (docs/02 §9.1). Prepared for public forms and switched on
 * with `TURNSTILE_ENABLED=true` when spam appears; while off it always passes.
 */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  const env = serverEnv();
  if (!env.TURNSTILE_ENABLED) return true;
  if (!token || !env.TURNSTILE_SECRET_KEY) return false;
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
      signal: AbortSignal.timeout(5_000),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
