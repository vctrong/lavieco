import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isServiceProblem } from "@lavieco/api-clients";

import { googleSignInEnabled, serverEnv } from "@/lib/env";
import { requestId } from "@/lib/request-meta";
import { identityClient, webLogger } from "@/lib/services";
import { setMemberSessionOn } from "@/lib/session";
import { MEMBER_COOKIES, safeNextPath } from "@/lib/session-cookies";

import {
  ERROR_PARAM,
  MEMBER_CONSENT_VERSION,
  NEXT_PARAM,
  OAUTH_COOKIE_MAX_AGE_SECONDS,
  ROUTES,
} from "../constants/config";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";

const oauthStateSchema = z.object({
  state: z.string().min(20),
  verifier: z.string().min(43),
  next: z.string(),
  consent: z.boolean(),
});

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

function withError(path: string, code: string) {
  return `${path}?${ERROR_PARAM}=${code}`;
}

/**
 * `GET /api/auth/google/start`: authorization-code flow with PKCE and state (ADR-0016).
 * `dong-y=1` is sent only from the sign-up form once the consent box is ticked.
 */
export function handleGoogleStart(request: NextRequest) {
  if (!googleSignInEnabled()) return redirectTo(request, withError(ROUTES.login, "google"));
  const env = serverEnv();
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const next = safeNextPath(request.nextUrl.searchParams.get(NEXT_PARAM));
  const consent = request.nextUrl.searchParams.get("dong-y") === "1";

  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const response = NextResponse.redirect(url, 303);
  response.cookies.set(MEMBER_COOKIES.oauth, JSON.stringify({ state, verifier, next, consent }), {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: ROUTES.googleCallback,
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

/** `GET /api/auth/google/callback`: checks state, lets identity-service exchange the code. */
export async function handleGoogleCallback(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const raw = request.cookies.get(MEMBER_COOKIES.oauth)?.value;
  let saved: z.infer<typeof oauthStateSchema> | null = null;
  try {
    saved = raw ? oauthStateSchema.parse(JSON.parse(raw)) : null;
  } catch {
    saved = null;
  }

  const code = params.get("code");
  if (!saved || !code || params.get("state") !== saved.state) {
    return clearOauth(redirectTo(request, withError(ROUTES.login, "google")));
  }

  try {
    const tokens = await identityClient().memberGoogleLogin(
      {
        code,
        codeVerifier: saved.verifier,
        redirectUri: serverEnv().GOOGLE_REDIRECT_URI,
        ...(saved.consent ? { consentVersion: MEMBER_CONSENT_VERSION } : {}),
      },
      await requestId(),
    );
    const response = redirectTo(request, safeNextPath(saved.next));
    setMemberSessionOn(response, tokens);
    return clearOauth(response);
  } catch (error) {
    if (isServiceProblem(error, "member.consent_required")) {
      return clearOauth(redirectTo(request, withError(ROUTES.signup, "google-dong-y")));
    }
    if (isServiceProblem(error, "member.google_not_allowed")) {
      return clearOauth(redirectTo(request, withError(ROUTES.login, "google-quan-tri")));
    }
    webLogger().warn("google sign-in failed", {
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    return clearOauth(redirectTo(request, withError(ROUTES.login, "google")));
  }
}

function clearOauth(response: NextResponse) {
  response.cookies.set(MEMBER_COOKIES.oauth, "", { path: ROUTES.googleCallback, maxAge: 0 });
  return response;
}
