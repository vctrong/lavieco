"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

/** The part of Cloudflare's `window.turnstile` API used here. */
type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileWidgetProps = {
  siteKey: string | null;
  /**
   * Change it after every submit: a Turnstile token is single use, so the widget is
   * reset and solves again for a fresh one (whether the submit worked or not).
   */
  resetSignal?: number;
};

/**
 * Cloudflare Turnstile challenge (docs/02 §9.1). Rendered only when the server passes a
 * site key, i.e. when `TURNSTILE_ENABLED=true`. The token is posted with the form under
 * the name `turnstileToken` and verified again on the server.
 */
export function TurnstileWidget({ siteKey, resetSignal = 0 }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const api = window.turnstile;
    const container = containerRef.current;
    if (!loaded || !siteKey || !api || !container) return;
    const id = api.render(container, {
      sitekey: siteKey,
      theme: "light",
      "response-field-name": "turnstileToken",
    });
    widgetId.current = id;
    return () => {
      api.remove(id);
      widgetId.current = null;
    };
  }, [loaded, siteKey]);

  useEffect(() => {
    if (resetSignal > 0 && widgetId.current) window.turnstile?.reset(widgetId.current);
  }, [resetSignal]);

  if (!siteKey) return null;
  return (
    <>
      {/* `onReady` also fires when the script is already on the page (client navigation). */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setLoaded(true)}
      />
      <div ref={containerRef} />
    </>
  );
}
