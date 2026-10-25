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

  it("logs other failures as warnings", () => {
    logProviderError("analyze", { id: "gemini" }, new Error("boom"));
    expect(logger.warn).toHaveBeenCalledWith(
      "laviagent analyze failed",
      expect.objectContaining({ errorName: "Error" }),
    );
  });
});
