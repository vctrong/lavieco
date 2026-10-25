import { describe, expect, it } from "vitest";

import {
  TIMEOUT_REASONS,
  classifyStreamEnd,
  outcomeLevel,
  type StreamFacts,
} from "./stream-outcome";

const facts = (overrides: Partial<StreamFacts>): StreamFacts => ({
  sawText: false,
  sawError: false,
  aborted: false,
  timeoutReason: null,
  clientAborted: false,
  ...overrides,
});

describe("classifyStreamEnd", () => {
  it("separates a visitor's stop from a server timeout", () => {
    expect(classifyStreamEnd(facts({ aborted: true, clientAborted: true }))).toBe("stopped");
    expect(
      classifyStreamEnd(facts({ aborted: true, timeoutReason: TIMEOUT_REASONS.firstChunk })),
    ).toBe("first_chunk_timeout");
    expect(
      classifyStreamEnd(
        facts({ aborted: true, sawText: true, timeoutReason: TIMEOUT_REASONS.total }),
      ),
    ).toBe("total_timeout");
  });

  it("reports provider errors, empty answers and normal answers", () => {
    expect(classifyStreamEnd(facts({ sawError: true }))).toBe("provider_error");
    expect(classifyStreamEnd(facts({}))).toBe("empty");
    expect(classifyStreamEnd(facts({ sawText: true }))).toBe("completed");
  });

  it("never logs a stop, always logs timeouts", () => {
    expect(outcomeLevel("stopped")).toBeNull();
    expect(outcomeLevel("first_chunk_timeout")).toBe("warn");
    expect(outcomeLevel("total_timeout")).toBe("warn");
    expect(outcomeLevel("provider_error")).toBe("error");
  });
});
