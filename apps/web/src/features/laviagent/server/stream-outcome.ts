/**
 * How an AI request ended (docs/07 §3). Pure, so the rules are unit-tested: a visitor's
 * "Dừng" is not an incident, a server timeout is, and a provider error carries its status.
 */
export type StreamOutcome =
  "completed" | "stopped" | "first_chunk_timeout" | "total_timeout" | "provider_error" | "empty";

/** Abort reasons the handlers set on their own controller. */
export const TIMEOUT_REASONS = {
  firstChunk: "first_chunk_timeout",
  total: "total_timeout",
} as const;

export type StreamFacts = {
  /** At least one piece of answer text arrived. */
  sawText: boolean;
  /** The provider (or the stream) reported an error. */
  sawError: boolean;
  /** The stream ended by an abort. */
  aborted: boolean;
  /** The reason given to the handler's own AbortController, if it fired. */
  timeoutReason: string | null;
  /** The browser went away or the visitor pressed "Dừng". */
  clientAborted: boolean;
};

export function classifyStreamEnd(facts: StreamFacts): StreamOutcome {
  // A timeout wins over the abort it causes, and over a late provider error.
  if (facts.timeoutReason === TIMEOUT_REASONS.firstChunk) return "first_chunk_timeout";
  if (facts.timeoutReason === TIMEOUT_REASONS.total) return "total_timeout";
  if (facts.clientAborted) return "stopped";
  if (facts.sawError) return "provider_error";
  if (facts.aborted) return "stopped";
  return facts.sawText ? "completed" : "empty";
}

/** Log level per outcome: nothing for a stop, warn for timeouts and empty answers. */
export function outcomeLevel(outcome: StreamOutcome): "info" | "warn" | "error" | null {
  switch (outcome) {
    case "stopped":
      return null;
    case "completed":
      return "info";
    case "provider_error":
      return "error";
    default:
      return "warn";
  }
}
