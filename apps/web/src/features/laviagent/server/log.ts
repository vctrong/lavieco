import "server-only";

import { APICallError } from "ai";

import { webLogger } from "@/lib/services";

type Meta = Record<string, string | number | boolean>;

/**
 * Logs without ever failing the request: the logger reads `serverEnv()`, which may be
 * incomplete on a demo machine that only runs LaviAgent. Never pass PII or image data.
 */
function log(level: "warn" | "error", message: string, meta: Meta) {
  try {
    webLogger()[level](message, meta);
  } catch {
    // No logger available: the request still answers.
  }
}

export function logWarn(message: string, meta: Meta) {
  log("warn", message, meta);
}

/**
 * A provider call failed. A 404 almost always means GEMINI_MODEL names a model that is
 * retired (or not open to this key): say so plainly, it is the first thing to fix.
 * Only the status, error name and model are logged, never the request body.
 */
export function logProviderError(
  operation: "analyze" | "chat",
  provider: { id: string; model?: string },
  error: unknown,
) {
  const meta: Meta = {
    operation,
    provider: provider.id,
    ...(provider.model ? { model: provider.model } : {}),
    errorName: error instanceof Error ? error.name : "unknown",
  };
  if (APICallError.isInstance(error) && error.statusCode !== undefined) {
    meta.statusCode = error.statusCode;
    if (error.statusCode === 404) {
      log("error", "laviagent model not found: check GEMINI_MODEL (docs/07 §7)", meta);
      return;
    }
    if (error.statusCode === 429) {
      log("warn", "laviagent provider rate limited: consider a Flash-Lite GEMINI_MODEL", meta);
      return;
    }
  }
  log("warn", `laviagent ${operation} failed`, meta);
}
