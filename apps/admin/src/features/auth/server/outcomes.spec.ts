import { describe, expect, it, vi } from "vitest";

import { ServiceProblemError, ServiceUnavailableError } from "@lavieco/api-clients";

vi.mock("server-only", () => ({}));
const warn = vi.fn();
vi.mock("@/lib/services", () => ({ adminLogger: () => ({ warn }) }));

const { guarded, toFailure } = await import("./outcomes");

const REQUEST_ID = "9b2f6c1e-4a7d-4e0b-8c3a-1f2e3d4c5b6a";

describe("staff auth failures", () => {
  it("passes a rate limit on with its wait", () => {
    const error = new ServiceProblemError({
      type: "about:blank",
      title: "x",
      status: 429,
      code: "common.rate_limited",
      retryAfterSeconds: 60,
    });
    expect(toFailure(error, "staff.login")).toEqual({
      status: "error",
      reason: "rate_limited",
      retryAfterSeconds: 60,
    });
  });

  it("shows 'busy' only for an outage, with a reference and the request id logged", () => {
    warn.mockClear();
    expect(
      toFailure(new ServiceUnavailableError("unexpected status 502"), "staff.login", REQUEST_ID),
    ).toEqual({ status: "error", reason: "unavailable", ref: "9B2F6C1E" });
    expect(warn.mock.calls[0]?.[1]).toMatchObject({ requestId: REQUEST_ID, status: 502 });
  });

  it("never lets an action throw to the browser", async () => {
    expect(
      await guarded("staff.login", REQUEST_ID, async () => {
        throw new Error("bug");
      }),
    ).toEqual({ status: "error", reason: "unavailable", ref: "9B2F6C1E" });
  });
});
