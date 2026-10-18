import "server-only";

import { clientIp } from "@/lib/request-meta";
import { webLogger } from "@/lib/services";
import { verifyTurnstile } from "@/lib/turnstile";

/**
 * Honeypot `website` + Turnstile (only when `TURNSTILE_ENABLED`) on the public checkout
 * and ticket lookup. A filled honeypot means a bot. TODO: switch Turnstile on when spam
 * shows up (docs/05).
 */
export async function checkBot(input: {
  website?: string;
  turnstileToken?: string;
}): Promise<"human" | "honeypot" | "challenge_failed"> {
  if (input.website) {
    // The caller pretends success, so without this line a real buyer caught by an
    // autofilled honeypot just never gets a code. No PII.
    webLogger().warn("public form treated as a bot", { context: "checkout", check: "honeypot" });
    return "honeypot";
  }
  if (!(await verifyTurnstile(input.turnstileToken, await clientIp()))) return "challenge_failed";
  return "human";
}
