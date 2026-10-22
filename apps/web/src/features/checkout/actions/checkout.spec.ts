import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceProblemError, ServiceUnavailableError } from "@lavieco/api-clients";
import type { ErrorCode, ProblemDetails } from "@lavieco/shared";

import { TEXT } from "../constants/text";

const REQUEST_ID = "9b2f6c1e-4a7d-4e0b-8c3a-1f2e3d4c5b6a";
const MEMBER_EMAIL = "thanh.vien@example.test";

const warn = vi.fn();
const identity = {
  createOtpChallenge: vi.fn(),
  verifyOtpChallenge: vi.fn(),
  getMemberProfile: vi.fn(),
  memberEmailProof: vi.fn(),
};
const program = { createOrder: vi.fn() };
const session = { accessToken: null as string | null };
const turnstile = { ok: true, crash: false };

vi.mock("server-only", () => ({}));
vi.mock("@/lib/request-meta", () => ({
  requestId: async () => REQUEST_ID,
  clientIp: async () => "203.0.113.7",
}));
vi.mock("@/lib/services", () => ({
  identityClient: () => identity,
  programClient: () => program,
  webLogger: () => ({ warn }),
}));
vi.mock("@/lib/session", () => ({ readMemberSession: async () => session }));
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstile: async () => {
    if (turnstile.crash) throw new Error("bug");
    return turnstile.ok;
  },
}));

const { startCheckout } = await import("./checkout");

const problem = (status: number, code: ErrorCode, extra: Partial<ProblemDetails> = {}) =>
  new ServiceProblemError({ type: "about:blank", title: "x", status, code, ...extra });

const DRAFT = {
  eventSlug: "workshop-gia-dinh-chuong-gio-vo-oc",
  items: [{ ticketTypeId: "6650a1b2c3d4e5f6a7b8c9d0", quantity: 1 }],
  buyer: { fullName: "Nguyễn Văn A", email: "khach@example.test", phone: "0901 234 567" },
  answers: {},
  note: "",
  dataConsent: true,
  safetyAcknowledged: true,
  isGuardian: true,
  website: "",
  turnstileToken: "token-1",
};
const SIGNED = `${"a".repeat(24)}.${"b".repeat(43)}`;

beforeEach(() => {
  vi.clearAllMocks();
  session.accessToken = null;
  turnstile.ok = true;
  turnstile.crash = false;
  identity.createOtpChallenge.mockResolvedValue({
    challengeId: "challenge-123456",
    resendAvailableAt: "2026-10-22T10:00:45.000Z",
  });
  identity.getMemberProfile.mockResolvedValue({
    email: MEMBER_EMAIL,
    displayName: "Thành Viên",
    emailVerifiedAt: "2026-10-01T00:00:00.000Z",
  });
  identity.memberEmailProof.mockResolvedValue({ verificationToken: "member-proof" });
  program.createOrder.mockResolvedValue({ accessToken: SIGNED, order: { status: "pending" } });
});

describe("startCheckout: signed-in member (no OTP)", () => {
  it("books at once with the member's proof when the ticket email is the account's", async () => {
    session.accessToken = "member-access";
    const result = await startCheckout({
      ...DRAFT,
      buyer: { ...DRAFT.buyer, email: "Thanh.Vien@Example.test" },
    });
    expect(result).toEqual({
      status: "ok",
      kind: "placed",
      redirectTo: `/chuong-trinh/thanh-toan/${SIGNED}`,
    });
    expect(program.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ verificationToken: "member-proof" }),
      REQUEST_ID,
    );
    expect(identity.createOtpChallenge).not.toHaveBeenCalled();
  });

  it("falls back to the email code when the ticket goes to another email", async () => {
    session.accessToken = "member-access";
    const result = await startCheckout(DRAFT);
    expect(result).toMatchObject({ status: "ok", kind: "code" });
    expect(identity.memberEmailProof).not.toHaveBeenCalled();
    expect(program.createOrder).not.toHaveBeenCalled();
    expect(identity.createOtpChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ email: DRAFT.buyer.email, purpose: "checkout" }),
      REQUEST_ID,
    );
  });

  it("explains a sold-out order instead of 'busy'", async () => {
    session.accessToken = "member-access";
    program.createOrder.mockRejectedValue(problem(409, "order.sold_out"));
    const result = await startCheckout({
      ...DRAFT,
      buyer: { ...DRAFT.buyer, email: MEMBER_EMAIL },
    });
    expect(result).toEqual({ status: "error", reason: "sold_out" });
  });

  it("shows 'busy' with a reference when program-service is down", async () => {
    session.accessToken = "member-access";
    program.createOrder.mockRejectedValue(new ServiceUnavailableError("unexpected status 503"));
    const result = await startCheckout({
      ...DRAFT,
      buyer: { ...DRAFT.buyer, email: MEMBER_EMAIL },
    });
    expect(result).toEqual({ status: "error", reason: "unavailable", ref: "9B2F6C1E" });
    expect(warn.mock.calls[0]?.[1]).toMatchObject({
      context: "checkout.member_order",
      requestId: REQUEST_ID,
    });
  });
});

describe("startCheckout: failures each get their own answer", () => {
  it("returns inline errors for missing fields", async () => {
    const result = await startCheckout({
      ...DRAFT,
      buyer: { fullName: "", email: "", phone: "" },
      dataConsent: false,
    });
    expect(result).toEqual({
      status: "invalid",
      fieldErrors: {
        fullName: TEXT.vi.validation.fullName,
        email: TEXT.vi.validation.emailRequired,
        phone: TEXT.vi.validation.phoneRequired,
        dataConsent: TEXT.vi.validation.consent,
      },
    });
    expect(identity.createOtpChallenge).not.toHaveBeenCalled();
  });

  it("returns an inline error for a malformed email", async () => {
    const result = await startCheckout({ ...DRAFT, buyer: { ...DRAFT.buyer, email: "ban@" } });
    expect(result).toEqual({
      status: "invalid",
      fieldErrors: { email: TEXT.vi.validation.email },
    });
  });

  it("says the check failed when Turnstile refuses the token", async () => {
    turnstile.ok = false;
    expect(await startCheckout(DRAFT)).toEqual({ status: "error", reason: "bot" });
    expect(identity.createOtpChallenge).not.toHaveBeenCalled();
  });

  it("passes the wait on when the visitor is rate limited", async () => {
    identity.createOtpChallenge.mockRejectedValue(
      problem(429, "common.rate_limited", { retryAfterSeconds: 42 }),
    );
    expect(await startCheckout(DRAFT)).toEqual({
      status: "error",
      reason: "rate_limited",
      retryAfterSeconds: 42,
    });
  });

  it("says the code was not sent when identity cannot send the email (503)", async () => {
    identity.createOtpChallenge.mockRejectedValue(problem(503, "common.unavailable"));
    expect(await startCheckout(DRAFT)).toEqual({
      status: "error",
      reason: "code_not_sent",
      ref: "9B2F6C1E",
    });
  });

  it("never throws to the browser: an unexpected error becomes a referenced 'busy'", async () => {
    turnstile.crash = true;
    expect(await startCheckout(DRAFT)).toEqual({
      status: "error",
      reason: "unavailable",
      ref: "9B2F6C1E",
    });
  });
});
