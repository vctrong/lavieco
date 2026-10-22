import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceProblemError } from "@lavieco/api-clients";

const REQUEST_ID = "9b2f6c1e-4a7d-4e0b-8c3a-1f2e3d4c5b6a";
const identity = { memberLogin: vi.fn() };
const turnstile = { ok: true };

vi.mock("server-only", () => ({}));
vi.mock("@/lib/request-meta", () => ({
  requestId: async () => REQUEST_ID,
  clientIp: async () => "203.0.113.7",
}));
vi.mock("@/lib/services", () => ({
  identityClient: () => identity,
  webLogger: () => ({ warn: vi.fn() }),
}));
vi.mock("@/lib/session", () => ({ setMemberSession: vi.fn() }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: async () => turnstile.ok }));

const { login } = await import("./login");

const VALID = {
  email: "thanh.vien@example.test",
  password: "mat-khau-thu",
  website: "",
  turnstileToken: "t",
};

beforeEach(() => {
  vi.clearAllMocks();
  turnstile.ok = true;
  identity.memberLogin.mockResolvedValue({ accessToken: "a", refreshToken: "r" });
});

describe("login: each failure gets its own answer", () => {
  it("signs in", async () => {
    expect(await login(VALID)).toEqual({ status: "ok" });
  });

  it("returns inline errors for missing fields", async () => {
    expect(await login({ ...VALID, email: "", password: "" })).toEqual({
      status: "invalid",
      fieldErrors: {
        email: "Bạn vui lòng nhập email.",
        password: "Bạn vui lòng nhập mật khẩu.",
      },
    });
  });

  it("says the check failed when Turnstile refuses the token", async () => {
    turnstile.ok = false;
    expect(await login(VALID)).toEqual({ status: "error", reason: "bot" });
    expect(identity.memberLogin).not.toHaveBeenCalled();
  });

  it("passes a rate limit on with its wait", async () => {
    identity.memberLogin.mockRejectedValue(
      new ServiceProblemError({
        type: "about:blank",
        title: "x",
        status: 429,
        code: "common.rate_limited",
        retryAfterSeconds: 30,
      }),
    );
    expect(await login(VALID)).toEqual({
      status: "error",
      reason: "rate_limited",
      retryAfterSeconds: 30,
    });
  });

  it("answers 'busy' with a reference when identity is down", async () => {
    identity.memberLogin.mockRejectedValue(new Error("connect ECONNREFUSED"));
    expect(await login(VALID)).toEqual({ status: "error", reason: "unavailable", ref: "9B2F6C1E" });
  });
});
