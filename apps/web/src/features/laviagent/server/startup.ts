import "server-only";

import { DEFAULT_GEMINI_MODEL, laviagentEnv } from "@/lib/env";

import { logInfo, logWarn } from "./log";

/**
 * Once per server start (instrumentation.ts): say which model actually runs when the
 * environment overrides the default (a stale `.env.local` line is the usual surprise),
 * and warn loudly when the pitch mode is on. Names only, never the key.
 */
export function logLaviagentStartup() {
  let env;
  try {
    env = laviagentEnv();
  } catch {
    logWarn("laviagent environment invalid: LaviAgent routes will fail", {});
    return;
  }
  if (env.GEMINI_MODEL !== DEFAULT_GEMINI_MODEL) {
    logInfo("laviagent GEMINI_MODEL overridden by the environment", {
      model: env.GEMINI_MODEL,
      defaultModel: DEFAULT_GEMINI_MODEL,
    });
  }
  if (env.LAVIAGENT_DEMO_VO_SO) {
    logWarn(
      "laviagent LAVIAGENT_DEMO_VO_SO is ON: every photo is analysed as a seashell. Pitch only, turn it off in production",
      {},
    );
  }
  if (env.LAVIAGENT_DEMO_MODE === "offline" || !env.GEMINI_API_KEY) {
    logInfo("laviagent runs offline (fixed answers only)", {
      reason: env.LAVIAGENT_DEMO_MODE === "offline" ? "LAVIAGENT_DEMO_MODE" : "no GEMINI_API_KEY",
    });
  }
}
