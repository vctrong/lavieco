"use client";

import { useEffect } from "react";

import { publicEnv } from "@/lib/env.public";

import { PWA_PATHS } from "../constants/app";

/**
 * Registers `public/sw.js` in production only. In development it removes any worker
 * left by a production build on the same origin, so `next dev` never serves stale files.
 */
export function ServiceWorkerRegistrar() {
  const enabled = publicEnv.isProductionBuild;
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (!enabled) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((item) => item.unregister())))
        .catch(() => undefined);
      return;
    }
    // A failed registration only means no offline page and no push: the app still works.
    void navigator.serviceWorker
      .register(PWA_PATHS.serviceWorker, { scope: "/", updateViaCache: "none" })
      .catch(() => undefined);
  }, [enabled]);
  return null;
}
