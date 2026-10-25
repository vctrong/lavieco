import { APICallError } from "ai";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const logger = { warn: vi.fn(), error: vi.fn() };
vi.mock("@/lib/services", () => ({ webLogger: () => logger }));

const { logProviderError } = await import("./log");

const apiError = (statusCode: number) =>
  new APICallError({
    message: "x",
    url: "https://example.test",
    requestBodyValues: {},
    statusCode,
  });

describe("logProviderError", () => {
  it("names a retired model (404) plainly, with the model and no request body", () => {
    logProviderError("chat", { id: "gemini", model: "gemini-2.5-flash" }, apiError(404));
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("model not found"),
      expect.objectContaining({ model: "gemini-2.5-flash", statusCode: 404, operation: "chat" }),
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("requestBodyValues");
  });

  it("logs other provider failures as errors", () => {
    logProviderError("analyze", { id: "gemini" }, new Error("boom"));
    expect(logger.error).toHaveBeenCalledWith(
      "laviagent analyze provider error",
      expect.objectContaining({ errorName: "Error" }),
    );
  });

  it("reads the status through the SDK's retry wrapper (503 = overloaded model)", () => {
    const retry = Object.assign(new Error("Failed after 2 attempts"), {
      name: "AI_RetryError",
      lastError: apiError(503),
    });
    logProviderError("chat", { id: "gemini", model: "gemini-3.8-flash" }, retry);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("overloaded"),
      expect.objectContaining({ statusCode: 503, model: "gemini-3.8-flash" }),
    );
  });
});
