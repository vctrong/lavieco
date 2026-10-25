import "server-only";

import { randomUUID } from "node:crypto";

import { publicEnv } from "@/lib/env.public";

/**
 * In-memory fixed windows, enough for a single-instance demo (ADR-0022: one VPS).
 * Resets on restart and is not shared between instances: move to the service with
 * MongoDB TTL counters if LaviAgent outgrows the demo.
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_KEYS = 10_000;

function prune(now: number) {
  if (windows.size < MAX_KEYS) return;
  for (const [key, window] of windows) if (window.resetAt <= now) windows.delete(key);
}

/** Counts one hit; false once `limit` hits happened inside the window. */
export function consume(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  prune(now);
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export const SESSION_COOKIE = "lv_agent";
const SESSION_MAX_AGE_S = 60 * 60 * 24;

/**
 * Anonymous LaviAgent session: a random id in an httpOnly cookie, used only to count
 * messages. It identifies nobody and is never stored server-side beyond the counters.
 */
export function readSession(request: Request): { id: string; setCookie: string | null } {
  const cookies = request.headers.get("cookie") ?? "";
  const found = cookies
    .split(";")
    .map((pair) => pair.trim().split("="))
    .find(([name]) => name === SESSION_COOKIE)?.[1];
  if (found && /^[0-9a-f-]{36}$/.test(found)) return { id: found, setCookie: null };
  const id = randomUUID();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return {
    id,
    setCookie: `${SESSION_COOKIE}=${id}; Path=/api/laviagent; Max-Age=${SESSION_MAX_AGE_S}; HttpOnly; SameSite=Lax${secure}`,
  };
}

/**
 * Other sites must not spend our model quota through a visitor's browser: a POST from a
 * page of another origin is refused (no Origin header = same-origin or non-browser).
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(publicEnv.siteUrl).origin;
}

/** Visitor IP for the counters only (never logged). Same headers as lib/request-meta. */
export function clientIpOf(request: Request): string {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return ip.slice(0, 64);
}
