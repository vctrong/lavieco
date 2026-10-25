import "server-only";

import { webLogger } from "@/lib/services";

/**
 * Warn without ever failing the request: the logger reads `serverEnv()`, which may be
 * incomplete on a demo machine that only runs LaviAgent. Never pass PII or image data.
 */
export function logWarn(message: string, meta: Record<string, string | number | boolean>) {
  try {
    webLogger().warn(message, meta);
  } catch {
    // No logger available: the request still answers.
  }
}
