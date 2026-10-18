import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ServiceProblemError, ServiceUnavailableError } from "@lavieco/api-clients";

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
