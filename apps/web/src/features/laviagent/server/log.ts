import "server-only";

import { APICallError } from "ai";

import { webLogger } from "@/lib/services";

import { outcomeLevel, type StreamOutcome } from "./stream-outcome";

type Meta = Record<string, string | number | boolean>;
type Level = "info" | "warn" | "error";

/**
 * Logs without ever failing the request: the logger reads `serverEnv()`, which may be
 * incomplete on a demo machine that only runs LaviAgent. Never pass PII, message text,
 * images or keys: only names, statuses and durations.
 */
function log(level: Level, message: string, meta: Meta) {
  try {
    webLogger()[level](message, meta);
  } catch {
    // No logger available: the request still answers.
  }
}

export function logInfo(message: string, meta: Meta) {
  log("info", message, meta);
}

export function logWarn(message: string, meta: Meta) {
  log("warn", message, meta);
}

/** The AI SDK wraps the last HTTP failure in a RetryError after its retries. */
function rootCause(error: unknown): unknown {
  if (error && typeof error === "object" && "lastError" in error) return error.lastError;
  return error;
}

/**
 * A provider call failed. The HTTP status says where the problem is: 404 a retired
 * GEMINI_MODEL, 400 an option the model refuses (thinking level), 429 quota, 503 the
 * model overloaded on Google's side. Never the request body.
 */
export function logProviderError(
  operation: "analyze" | "chat",
  provider: { id: string; model?: string },
  error: unknown,
) {
  const cause = rootCause(error);
  const meta: Meta = {
    operation,
    provider: provider.id,
    ...(provider.model ? { model: provider.model } : {}),
    errorName: error instanceof Error ? error.name : "unknown",
  };
  if (APICallError.isInstance(cause) && cause.statusCode !== undefined) {
    meta.statusCode = cause.statusCode;
    const hint: Record<number, string> = {
      400: "laviagent provider refused the request: check GEMINI_THINKING for this model",
      404: "laviagent model not found: check GEMINI_MODEL (docs/07 §7)",
      429: "laviagent provider rate limited: consider a Flash-Lite GEMINI_MODEL",
      503: "laviagent model overloaded on the provider side: retry later or change GEMINI_MODEL",
    };
    log("error", hint[cause.statusCode] ?? `laviagent ${operation} provider error`, meta);
    return;
  }
  log("error", `laviagent ${operation} provider error`, meta);
}

/** One line per AI request: which model, how fast, how it ended. Silent for a "Dừng". */
export function logOutcome(
  operation: "analyze" | "chat",
  facts: {
    provider: string;
    model?: string;
    outcome: StreamOutcome | "demo_shell";
    firstChunkMs?: number;
    totalMs: number;
  },
) {
  const level = facts.outcome === "demo_shell" ? "info" : outcomeLevel(facts.outcome);
  if (!level) return;
  const meta: Meta = {
    operation,
    provider: facts.provider,
    outcome: facts.outcome,
    totalMs: facts.totalMs,
    ...(facts.model ? { model: facts.model } : {}),
    ...(facts.firstChunkMs !== undefined ? { firstChunkMs: facts.firstChunkMs } : {}),
  };
  // Provider errors are logged with their status by logProviderError; this is the summary.
  log(level === "error" ? "warn" : level, `laviagent ${operation} ${facts.outcome}`, meta);
}
