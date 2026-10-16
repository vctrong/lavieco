import "server-only";

import { connection } from "next/server";

import { googleSignInEnabled } from "@/lib/env";
import { turnstileSiteKey } from "@/lib/turnstile";

/**
 * Switches the auth pages need from the server configuration (F3: env read here only).
 * Read at request time, never while prerendering at build (no runtime secrets in CI).
 */
export async function authPageOptions() {
  await connection();
  return { googleEnabled: googleSignInEnabled(), turnstileSiteKey: turnstileSiteKey() };
}
