import { describe, expect, it, vi } from "vitest";

import type { TokenPair } from "@lavieco/shared/identity";

import { createSessionRefresher } from "./session-refresh";

const pair = (n: number): TokenPair => ({
  accessToken: `access-${n}`,
  refreshToken: `refresh-${n}`,
  accessTokenExpiresAt: "2026-11-15T10:10:00.000Z",
  refreshTokenExpiresAt: "2026-11-15T22:00:00.000Z",
});

describe("createSessionRefresher", () => {
  it("rotates one refresh token once for callers in flight together", async () => {
    let n = 0;
    const refresh = vi.fn(async () => pair(++n));
    const refresher = createSessionRefresher(refresh);

    const [a, b] = await Promise.all([refresher("old"), refresher("old")]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(a).toEqual(pair(1));
    expect(b).toEqual(pair(1));
  });

  it("hands the same answer to a late caller within the reuse window, then forgets it", async () => {
    let clock = 0;
    let n = 0;
    const refresh = vi.fn(async () => pair(++n));
    const refresher = createSessionRefresher(refresh, { reuseMs: 1000, now: () => clock });

    await refresher("old");
    clock = 900;
    expect(await refresher("old")).toEqual(pair(1));
    clock = 2000;
    expect(await refresher("old")).toEqual(pair(2));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("does not keep a failure, so the next call tries again", async () => {
    const refresh = vi
      .fn<(token: string) => Promise<TokenPair>>()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(pair(1));
    const refresher = createSessionRefresher(refresh);

    await expect(refresher("old")).rejects.toThrow("fetch failed");
    expect(await refresher("old")).toEqual(pair(1));
  });

  it("keeps different tokens apart", async () => {
    const refresh = vi.fn(async (token: string) => pair(token === "a" ? 1 : 2));
    const refresher = createSessionRefresher(refresh);

    expect(await refresher("a")).toEqual(pair(1));
    expect(await refresher("b")).toEqual(pair(2));
  });
});
