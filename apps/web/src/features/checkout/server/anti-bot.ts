import "server-only";

import { clientIp } from "@/lib/request-meta";
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
  if (input.website) return "honeypot";
  if (!(await verifyTurnstile(input.turnstileToken, await clientIp()))) return "challenge_failed";
  return "human";
}
