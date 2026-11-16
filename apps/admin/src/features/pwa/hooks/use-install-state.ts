"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { isIosDevice, isStandalone } from "@/shared/standalone";

import { INSTALL_SNOOZE_KEY, INSTALL_SNOOZE_MS } from "../constants/app";

/** Chrome/Edge/Samsung event (not in the DOM typings). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState =
  { kind: "hidden" } | { kind: "prompt"; install: () => Promise<void> } | { kind: "ios" };

/** Where the page runs, as far as the install hint cares. Stable strings for React. */
type Platform = "server" | "installed" | "snoozed" | "ios" | "other";

/** Safari on iPhone/iPad: Chrome/Firefox/Edge on iOS install through their own menus. */
function isIosSafari(): boolean {
  return isIosDevice() && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
}

function snoozed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(INSTALL_SNOOZE_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < INSTALL_SNOOZE_MS;
  } catch {
    return false;
  }
}

function platform(): Platform {
  if (isStandalone()) return "installed";
  if (snoozed()) return "snoozed";
  return isIosSafari() ? "ios" : "other";
}

const noSubscription = () => () => undefined;

/**
 * Whether and how to suggest installing the app: the native prompt where the browser
 * offers one, written steps on iOS Safari, nothing when installed or snoozed. The server
 * render shows nothing, so hydration never disagrees.
 */
export function useInstallState(): { state: InstallState; dismiss: () => void } {
  const where = useSyncExternalStore<Platform>(noSubscription, platform, () => "server");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (where !== "other") return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDismissed(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [where]);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(INSTALL_SNOOZE_KEY, String(Date.now()));
    } catch {
      // Private mode: the hint simply comes back next time.
    }
    setDismissed(true);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    // A prompt event can be used once only.
    setDeferred(null);
    setDismissed(true);
  }, [deferred]);

  if (dismissed) return { state: { kind: "hidden" }, dismiss };
  if (where === "ios") return { state: { kind: "ios" }, dismiss };
  if (where === "other" && deferred) return { state: { kind: "prompt", install }, dismiss };
  return { state: { kind: "hidden" }, dismiss };
}
