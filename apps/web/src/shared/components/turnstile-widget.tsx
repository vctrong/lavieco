"use client";

import Script from "next/script";

/**
 * Cloudflare Turnstile challenge (docs/02 §9.1). Rendered only when the server passes a
 * site key, i.e. when `TURNSTILE_ENABLED=true`. The token is posted with the form under
 * the name `turnstileToken` and verified again on the server.
 */
export function TurnstileWidget({ siteKey }: { siteKey: string | null }) {
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-response-field-name="turnstileToken"
        data-theme="light"
      />
    </>
  );
}
