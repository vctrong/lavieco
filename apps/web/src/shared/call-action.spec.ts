import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import { describe, expect, it } from "vitest";

import { callAction, failureOfThrown } from "./call-action";

describe("failureOfThrown", () => {
  // A page opened before a deploy or rebuild calls action ids the server no longer has.
  it("asks for a reload when the page is older than the server", () => {
    const error = new UnrecognizedActionError('Server Action "abc" was not found');
    expect(failureOfThrown(error, true)).toEqual({ status: "error", reason: "stale_version" });
  });

  it("says the connection is down when the request never got an answer", () => {
    expect(failureOfThrown(new TypeError("Failed to fetch"), true).reason).toBe("offline");
    expect(failureOfThrown(new Error("anything"), false).reason).toBe("offline");
  });

  it("keeps 'unavailable' for anything else", () => {
    expect(failureOfThrown(new Error("boom"), true).reason).toBe("unavailable");
  });
});

describe("callAction", () => {
  it("returns the action's result, or the failure instead of throwing", async () => {
    expect(await callAction(async () => ({ status: "ok" }))).toEqual({ status: "ok" });
    expect(
      await callAction(async () => {
        throw new UnrecognizedActionError("gone");
      }),
    ).toEqual({ status: "error", reason: "stale_version" });
  });
});
