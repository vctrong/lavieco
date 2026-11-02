import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  read: vi.fn(),
  createToken: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ readStaffSession: session.read }));
vi.mock("@/lib/request-meta", () => ({ requestId: async () => "req-1" }));
vi.mock("@/lib/env", () => ({
  serverEnv: () => ({ WEB_APP_URL: "https://web.test" }),
  adminAppUrl: () => "https://admin.test",
}));
vi.mock("@/lib/services", () => ({
  programClient: () => ({ createEventPreviewToken: session.createToken }),
}));
vi.mock("@lavieco/api-clients", () => ({
  isServiceProblem: (error: unknown) =>
    typeof error === "object" && error !== null && "status" in error,
}));

import { previewRedirect } from "./preview-redirect";

const EVENT_ID = "64b7f0c2a1b2c3d4e5f60701";

describe("previewRedirect", () => {
  beforeEach(() => {
    session.read.mockReset();
    session.createToken.mockReset();
  });

  it("mints a token per click and redirects to the web preview with 302", async () => {
    session.read.mockResolvedValue({ accessToken: "staff", refreshToken: "r" });
    session.createToken.mockResolvedValue({ token: "abc", expiresAt: "2026-11-02T00:00:00.000Z" });

    const response = await previewRedirect(EVENT_ID);

    expect(session.createToken).toHaveBeenCalledWith("staff", EVENT_ID, "req-1");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      `https://web.test/xem-truoc/chuong-trinh/abc?su-kien=${EVENT_ID}`,
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("sends a visitor without a session to the login page", async () => {
    session.read.mockResolvedValue({ accessToken: null, refreshToken: null });
    const response = await previewRedirect(EVENT_ID);
    expect(response.headers.get("location")).toBe("https://admin.test/login");
    expect(session.createToken).not.toHaveBeenCalled();
  });

  it("refreshes an expired staff token and comes back here", async () => {
    session.read.mockResolvedValue({ accessToken: "old", refreshToken: "r" });
    session.createToken.mockRejectedValue({ status: 401 });
    const response = await previewRedirect(EVENT_ID);
    expect(response.headers.get("location")).toBe(
      `https://admin.test/api/auth/refresh?next=${encodeURIComponent(`/events/${EVENT_ID}/preview`)}`,
    );
  });

  it("gives no token without program:read and reports it on the list", async () => {
    session.read.mockResolvedValue({ accessToken: "staff", refreshToken: "r" });
    session.createToken.mockRejectedValue({ status: 403 });
    const response = await previewRedirect(EVENT_ID);
    expect(response.headers.get("location")).toBe("https://admin.test/events?xem-truoc=loi");
  });

  it("refuses a malformed id before calling anything", async () => {
    const response = await previewRedirect("not-an-id");
    expect(response.headers.get("location")).toBe("https://admin.test/events?xem-truoc=loi");
    expect(session.read).not.toHaveBeenCalled();
  });
});
