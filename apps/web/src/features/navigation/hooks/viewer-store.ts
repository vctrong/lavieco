"use client";

import { useSyncExternalStore } from "react";

import { VIEWER_CHANGED_EVENT } from "@/shared/constants/events";

import {
  SESSION_REFRESH_ENDPOINT,
  SESSION_REFRESH_LOCK,
  VIEWER_ENDPOINT,
} from "../constants/config";
import { viewerSchema, type Viewer } from "../schemas";
import type { ViewerState } from "../types";

const LOADING: ViewerState = { kind: "loading" };

const listeners = new Set<() => void>();
let state: ViewerState = LOADING;
let started = false;
/** Bumped by every load and by sign-out: an older answer never overwrites a newer state. */
let generation = 0;

function set(next: ViewerState) {
  state = next;
  listeners.forEach((listener) => listener());
}

/** `null` when the endpoint failed or answered something unexpected. */
async function fetchViewer(): Promise<Viewer | null> {
  try {
    const response = await fetch(VIEWER_ENDPOINT, { cache: "no-store" });
    if (!response.ok) return null;
    const parsed = viewerSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const settled = (viewer: Viewer | null): ViewerState =>
  viewer === null
    ? { kind: "unknown" }
    : viewer.kind === "needs_refresh"
      ? { kind: "guest" }
      : viewer;

/**
 * The access token expired. Only one tab rotates the refresh token at a time: inside
 * the lock, ask again first, since another tab may have rotated it meanwhile (its new
 * cookies are shared). Without Web Locks the bar shows a neutral account icon and the
 * account page's own refresh flow takes over.
 * TODO(session-refresh-grace): the root fix is a reuse grace window in identity-service;
 * this lock cannot stop concurrent rotations from the server or from another device.
 */
async function refreshThenAsk(): Promise<ViewerState> {
  if (typeof navigator === "undefined" || !navigator.locks) return { kind: "unknown" };
  return navigator.locks.request(SESSION_REFRESH_LOCK, async () => {
    const again = await fetchViewer();
    if (again?.kind !== "needs_refresh") return settled(again);
    try {
      // The endpoint answers with a redirect that sets (or clears) the cookies; only the
      // cookies matter here, so the redirect is not followed.
      await fetch(SESSION_REFRESH_ENDPOINT, { redirect: "manual", cache: "no-store" });
    } catch {
      // Asking again below shows the outcome either way.
    }
    // A failed rotation cleared the session: still `needs_refresh` here means guest too.
    return settled(await fetchViewer());
  });
}

async function resolve(): Promise<ViewerState> {
  const viewer = await fetchViewer();
  return viewer?.kind === "needs_refresh" ? refreshThenAsk() : settled(viewer);
}

/** Asks who is viewing. The current state stays on screen until the answer arrives. */
export function loadViewer() {
  const ticket = ++generation;
  void resolve().then((next) => {
    if (ticket === generation) set(next);
  });
}

/** Called when the visitor signs out from the bar: shows the guest state right away. */
export function markSignedOut() {
  generation += 1;
  set({ kind: "guest" });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    window.addEventListener(VIEWER_CHANGED_EVENT, loadViewer);
    loadViewer();
  }
  return () => {
    listeners.delete(listener);
  };
}

/** Shared by the desktop cluster, the mobile button and the drawer: one request per load. */
export function useViewer(): ViewerState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING,
  );
}
