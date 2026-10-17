import {
  type AuditEventIngestRequest,
  invitationAcceptResponseSchema,
  invitationInspectResponseSchema,
  memberProfileSchema,
  otpChallengeCreateResponseSchema,
  otpChallengeVerifyResponseSchema,
  staffLoginResponseSchema,
  staffProfileSchema,
  tokenPairSchema,
  type InvitationAcceptRequest,
  type InvitationInspectRequest,
  type MemberGoogleRequest,
  type MemberLoginRequest,
  type MemberPasswordResetRequest,
  type MemberRegisterRequest,
  type OtpChallengeCreateRequest,
  type OtpChallengeVerifyRequest,
  type RefreshSessionRequest,
  type StaffLoginRequest,
  type StaffMfaRequest,
} from "@lavieco/shared/identity";

import { createHttpClient, type HttpClientOptions } from "./http-client";

const V1 = "/internal/v1";

export type IdentityClientOptions = Omit<HttpClientOptions, "audience">;

/** Typed client of identity-service (docs/04 §6.4). Every call carries an `x-request-id`. */
export function createIdentityClient(options: IdentityClientOptions) {
  const http = createHttpClient({ ...options, audience: "identity-service" });
  const service = { kind: "service" } as const;
  const user = (accessToken: string) => ({ kind: "user", accessToken }) as const;

  return {
    // --- staff (called by `admin`) ---
    staffLogin: (body: StaffLoginRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/staff-sessions`,
        auth: service,
        body,
        schema: staffLoginResponseSchema,
        requestId,
      }),
    staffVerifyMfa: (body: StaffMfaRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/staff-sessions/mfa`,
        auth: service,
        body,
        schema: tokenPairSchema,
        requestId,
      }),
    inspectInvitation: (body: InvitationInspectRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/invitations/inspect`,
        auth: service,
        body,
        schema: invitationInspectResponseSchema,
        requestId,
      }),
    acceptInvitation: (body: InvitationAcceptRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/invitations/accept`,
        auth: service,
        body,
        schema: invitationAcceptResponseSchema,
        requestId,
      }),
    getStaffProfile: (accessToken: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/staff/me`,
        auth: user(accessToken),
        schema: staffProfileSchema,
        requestId,
      }),

    // --- members and shared OTP (called by `web`) ---
    createOtpChallenge: (body: OtpChallengeCreateRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/otp-challenges`,
        auth: service,
        body,
        schema: otpChallengeCreateResponseSchema,
        requestId,
      }),
    verifyOtpChallenge: (body: OtpChallengeVerifyRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/otp-challenges/verify`,
        auth: service,
        body,
        schema: otpChallengeVerifyResponseSchema,
        requestId,
      }),
    registerMember: (body: MemberRegisterRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/members`,
        auth: service,
        body,
        schema: tokenPairSchema,
        requestId,
      }),
    memberLogin: (body: MemberLoginRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/member-sessions`,
        auth: service,
        body,
        schema: tokenPairSchema,
        requestId,
      }),
    memberGoogleLogin: (body: MemberGoogleRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/member-sessions/google`,
        auth: service,
        body,
        schema: tokenPairSchema,
        requestId,
      }),
    resetMemberPassword: (body: MemberPasswordResetRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/member-passwords/reset`,
        auth: service,
        body,
        requestId,
      }),
    getMemberProfile: (accessToken: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/members/me`,
        auth: user(accessToken),
        schema: memberProfileSchema,
        requestId,
      }),

    // --- sessions (both BFFs) ---
    refreshSession: (body: RefreshSessionRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/sessions/refresh`,
        auth: service,
        body,
        schema: tokenPairSchema,
        requestId,
      }),
    revokeSession: (body: RefreshSessionRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/sessions/revoke`,
        auth: service,
        body,
        requestId,
      }),

    // --- audit (other services, through their outbox, ADR-0021) ---
    recordAuditEvent: (body: AuditEventIngestRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/audit-events`,
        auth: service,
        body,
        idempotent: true,
        requestId,
      }),
  };
}

export type IdentityClient = ReturnType<typeof createIdentityClient>;
