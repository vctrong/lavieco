import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceProblemError } from "@lavieco/api-clients";
import type { ErrorCode, ProblemDetails } from "@lavieco/shared";

const session = { accessToken: null as string | null, refreshToken: null as string | null };
const setStaffSession = vi.fn();
const refreshSession = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("./session", () => ({
  readStaffSession: async () => ({ ...session }),
  setStaffSession: (tokens: unknown) => setStaffSession(tokens),
}));
vi.mock("./services", () => ({
  identityClient: () => ({ refreshSession }),
  adminLogger: () => ({ info: vi.fn(), warn: vi.fn() }),
}));

const { withStaffToken } = await import("./staff-token");

const problem = (code: ErrorCode, status: number) =>
  new ServiceProblemError({
    type: "about:blank",
    title: "x",
    status,
    code,
  } satisfies ProblemDetails);

let n = 0;
const fresh = () => {
  n += 1;
  return {
    accessToken: `access-${n}`,
    refreshToken: `refresh-${n}`,
    accessTokenExpiresAt: "2026-11-15T10:10:00.000Z",
    refreshTokenExpiresAt: "2026-11-15T22:00:00.000Z",
  };
};

describe("withStaffToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshSession.mockImplementation(async () => fresh());
  });

  it("uses a live access token without refreshing", async () => {
    Object.assign(session, { accessToken: "live", refreshToken: "rt-live" });
    const run = vi.fn(async (token: string) => `saved with ${token}`);

    expect(await withStaffToken("req", run)).toEqual({ session: "ok", value: "saved with live" });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("renews an expired access cookie from the refresh token, then saves", async () => {
    Object.assign(session, { accessToken: null, refreshToken: "rt-expired-cookie" });
    const run = vi.fn(async (token: string) => token);

    const call = await withStaffToken("req", run);

    expect(call.session).toBe("ok");
    expect(run).toHaveBeenCalledTimes(1);
    expect(setStaffSession).toHaveBeenCalledTimes(1);
  });

  it("retries once after a 401, with the renewed token", async () => {
    Object.assign(session, { accessToken: "revoked", refreshToken: "rt-401" });
    const run = vi
      .fn<(token: string) => Promise<string>>()
      .mockRejectedValueOnce(problem("common.unauthenticated", 401))
      .mockImplementation(async (token) => token);

    const call = await withStaffToken("req", run);

    expect(call).toEqual({ session: "ok", value: expect.stringMatching(/^access-/) });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("does not retry other failures (a 403 or a business error stays the caller's)", async () => {
    Object.assign(session, { accessToken: "live", refreshToken: "rt-403" });
    const run = vi.fn(async () => {
      throw problem("common.forbidden", 403);
    });

    await expect(withStaffToken("req", run)).rejects.toBeInstanceOf(ServiceProblemError);
    expect(run).toHaveBeenCalledTimes(1);
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("reports expired, without calling the service, when the refresh token is refused", async () => {
    Object.assign(session, { accessToken: null, refreshToken: "rt-revoked" });
    refreshSession.mockRejectedValueOnce(problem("auth.session_invalid", 401));
    const run = vi.fn();

    expect(await withStaffToken("req", run)).toEqual({ session: "expired" });
    expect(run).not.toHaveBeenCalled();
    expect(setStaffSession).not.toHaveBeenCalled();
  });

  it("reports expired with no session at all", async () => {
    Object.assign(session, { accessToken: null, refreshToken: null });
    expect(await withStaffToken("req", vi.fn())).toEqual({ session: "expired" });
  });

  it("rotates once when two actions find the same expired cookie", async () => {
    Object.assign(session, { accessToken: null, refreshToken: "rt-shared" });
    const run = vi.fn(async (token: string) => token);

    const [a, b] = await Promise.all([withStaffToken("r1", run), withStaffToken("r2", run)]);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it("gives up after one retry when the service keeps refusing", async () => {
    Object.assign(session, { accessToken: "revoked", refreshToken: "rt-loop" });
    const run = vi.fn(async () => {
      throw problem("common.unauthenticated", 401);
    });

    await expect(withStaffToken("req", run)).rejects.toBeInstanceOf(ServiceProblemError);
    expect(run).toHaveBeenCalledTimes(2);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
});
