import "server-only";

import { clientIp } from "@/lib/request-meta";
import { webLogger } from "@/lib/services";
import { verifyTurnstile } from "@/lib/turnstile";

import { botFieldsSchema } from "../schemas";

/**
 * Honeypot + Turnstile (when switched on) for public auth forms. A filled honeypot
 * means a bot: the caller pretends success without doing anything.
 */
export async function checkBot(input: unknown): Promise<"human" | "honeypot" | "challenge_failed"> {
  const parsed = botFieldsSchema.safeParse(input);
  if (!parsed.success) {
    // Logged so a real person caught by an autofilled honeypot can be noticed; no PII.
    webLogger().warn("public form treated as a bot", { context: "auth", check: "honeypot" });
    return "honeypot";
  }
  if (!(await verifyTurnstile(parsed.data.turnstileToken, await clientIp()))) {
    return "challenge_failed";
  }
  return "human";
}
