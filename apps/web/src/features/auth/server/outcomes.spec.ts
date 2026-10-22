import { describe, expect, it, vi } from "vitest";

import { ServiceProblemError, ServiceUnavailableError } from "@lavieco/api-clients";
import type { ErrorCode, ProblemDetails } from "@lavieco/shared";

vi.mock("server-only", () => ({}));
const warn = vi.fn();
vi.mock("@/lib/services", () => ({ webLogger: () => ({ warn }) }));

const { toAuthError, guarded } = await import("./outcomes");

const REQUEST_ID = "9b2f6c1e-4a7d-4e0b-8c3a-1f2e3d4c5b6a";
const problem = (status: number, code: ErrorCode, extra: Partial<ProblemDetails> = {}) =>
  new ServiceProblemError({ type: "about:blank", title: "x", status, code, ...extra });

describe("toAuthError: one message per kind of failure", () => {
  it("keeps the wait of a rate limit", () => {
    expect(
      toAuthError(problem(429, "common.rate_limited", { retryAfterSeconds: 20 }), "login"),
    ).toEqual({ status: "error", reason: "rate_limited", retryAfterSeconds: 20 });
  });

  it("puts a refused request under the fields the service names, in Vietnamese", () => {
    const result = toAuthError(
      problem(400, "common.validation_failed", {
        errors: [{ path: "email", message: "Invalid email" }],
      }),
      "login",
    );
    expect(result).toEqual({
      status: "invalid",
      fieldErrors: { email: "Email chưa đúng định dạng, ví dụ ten@example.com." },
    });
  });

  it("says the code was not sent when identity cannot send the email", () => {
    expect(
      toAuthError(problem(503, "common.unavailable"), "signup.request_code", REQUEST_ID),
    ).toEqual({ status: "error", reason: "code_not_sent", ref: "9B2F6C1E" });
  });

  it("shows 'busy' only for an outage, with the request id in the log", () => {
    warn.mockClear();
    expect(
      toAuthError(new ServiceUnavailableError("unexpected status 503"), "login", REQUEST_ID),
    ).toEqual({ status: "error", reason: "unavailable", ref: "9B2F6C1E" });
    expect(warn.mock.calls[0]?.[1]).toEqual({
      context: "login",
      errorCode: "unavailable",
      requestId: REQUEST_ID,
      failure: "status",
      status: 503,
    });
  });

  it("never lets an action throw to the browser", async () => {
    expect(
      await guarded("login", REQUEST_ID, async () => {
        throw new Error("bug");
      }),
    ).toEqual({ status: "error", reason: "unavailable", ref: "9B2F6C1E" });
  });
});
