import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ServiceProblemError, ServiceUnavailableError } from "@lavieco/api-clients";
import type { ErrorCode, ProblemDetails } from "@lavieco/shared";

vi.mock("server-only", () => ({}));
const warn = vi.fn();
vi.mock("@/lib/services", () => ({ webLogger: () => ({ warn }) }));

const { toCheckoutError } = await import("./outcomes");

const TOKEN = "6ad413de45bbb8a086f9e778.Cwvm5xI4EkKqrrl_VpBy3amK9WyfYKab3RYbWSEWyCY";

describe("toCheckoutError", () => {
  it("maps a known problem to its reason without logging", () => {
    warn.mockClear();
    const error = new ServiceProblemError({
      type: "about:blank",
      title: "Invalid state",
      status: 409,
      code: "order.invalid_state",
    });
    expect(toCheckoutError(error, "order.cancel")).toEqual({
      status: "error",
      reason: "invalid_state",
    });
    expect(warn).not.toHaveBeenCalled();
  });

  // The cancel button once showed "system busy" with nothing to tell why: the log now
  // says whether the service was down, answered an error, or broke the contract.
  it.each([
    [
      new ServiceUnavailableError(`program-service unreachable: POST /order-links/${TOKEN}/cancel`),
      { failure: "unreachable" },
    ],
    [new ServiceUnavailableError("unexpected status 500"), { failure: "status", status: 500 }],
    [
      new ServiceUnavailableError("response does not match the contract", {
        cause: z.object({ payment: z.object({ qrCode: z.string() }) }).safeParse({ payment: {} })
          .error,
      }),
      { failure: "contract", paths: ["payment.qrCode"] },
    ],
    [new Error("boom"), { failure: "unexpected" }],
  ])("logs the kind of failure, never the signed link (%s)", (error, kind) => {
    warn.mockClear();
    expect(toCheckoutError(error, "order.cancel")).toEqual({
      status: "error",
      reason: "unavailable",
    });
    const fields = warn.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(fields).toEqual({ context: "order.cancel", errorCode: "unavailable", ...kind });
    expect(JSON.stringify(warn.mock.calls)).not.toContain(TOKEN);
  });
});

const REQUEST_ID = "9b2f6c1e-4a7d-4e0b-8c3a-1f2e3d4c5b6a";

const problem = (status: number, code: ErrorCode, extra: Partial<ProblemDetails> = {}) =>
  new ServiceProblemError({ type: "about:blank", title: "x", status, code, ...extra });

describe("toCheckoutError: one message per kind of failure", () => {
  it("waits as long as the service says on a rate limit", () => {
    expect(
      toCheckoutError(problem(429, "common.rate_limited", { retryAfterSeconds: 30 }), "x"),
    ).toEqual({ status: "error", reason: "rate_limited", retryAfterSeconds: 30 });
  });

  it("puts a refused request under the fields the service names", () => {
    const refused = problem(400, "common.validation_failed", {
      errors: [
        { path: "buyer.email", message: "Invalid email" },
        { path: "items.0.quantity", message: "Too big" },
      ],
    });
    const result = toCheckoutError(refused, "checkout.order");
    expect(result.status).toBe("invalid");
    expect(result.status === "invalid" ? Object.keys(result.fieldErrors) : []).toEqual([
      "email",
      "tickets",
    ]);
    // The service's English text is never shown.
    expect(JSON.stringify(result)).not.toContain("Invalid email");
  });

  it("falls back to a general 'check the form' when no field is named", () => {
    expect(toCheckoutError(problem(400, "common.validation_failed"), "x")).toEqual({
      status: "error",
      reason: "invalid_input",
    });
  });

  it("says the code was not sent when identity cannot send the OTP email", () => {
    warn.mockClear();
    expect(
      toCheckoutError(problem(503, "common.unavailable"), "checkout.request_code", REQUEST_ID),
    ).toEqual({ status: "error", reason: "code_not_sent", ref: "9B2F6C1E" });
    expect(warn.mock.calls[0]?.[1]).toMatchObject({ requestId: REQUEST_ID });
  });

  it("shows 'busy' only for a real outage, with a short reference to the logs", () => {
    warn.mockClear();
    expect(
      toCheckoutError(
        new ServiceUnavailableError("unexpected status 503"),
        "checkout.order",
        REQUEST_ID,
      ),
    ).toEqual({ status: "error", reason: "unavailable", ref: "9B2F6C1E" });
    expect(warn.mock.calls[0]?.[1]).toEqual({
      context: "checkout.order",
      errorCode: "unavailable",
      requestId: REQUEST_ID,
      failure: "status",
      status: 503,
    });
  });

  it("maps a sold-out order to its own reason", () => {
    expect(toCheckoutError(problem(409, "order.sold_out"), "checkout.order")).toEqual({
      status: "error",
      reason: "sold_out",
    });
  });
});
