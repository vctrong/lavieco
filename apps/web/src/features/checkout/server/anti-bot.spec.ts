import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const warn = vi.fn();
vi.mock("@/lib/services", () => ({ webLogger: () => ({ warn }) }));
vi.mock("@/lib/request-meta", () => ({ clientIp: async () => "203.0.113.7" }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: async () => true }));

const { checkBot } = await import("./anti-bot");

describe("checkBot (checkout)", () => {
  it("lets a person through when the honeypot is empty", async () => {
    warn.mockClear();
    expect(await checkBot({ website: "", turnstileToken: "t" })).toBe("human");
    expect(warn).not.toHaveBeenCalled();
  });

  // A filled honeypot is answered with a fake "code sent": the log is the only trace
  // when a password manager fills it for a real buyer.
  it("logs a filled honeypot without the value or any personal data", async () => {
    warn.mockClear();
    expect(await checkBot({ website: "https://khach.example.test", turnstileToken: "t" })).toBe(
      "honeypot",
    );
    expect(warn).toHaveBeenCalledWith("public form treated as a bot", {
      context: "checkout",
      check: "honeypot",
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("khach.example.test");
  });
});
