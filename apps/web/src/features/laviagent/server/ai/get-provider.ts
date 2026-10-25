import "server-only";

import { laviagentEnv } from "@/lib/env";

import type { AIProvider } from "./ai-provider";
import { GeminiProvider } from "./gemini-provider";
import { LaviecoModelProvider } from "./lavieco-model-provider";
import { OfflineProvider } from "./offline-provider";

let instance: AIProvider | null = null;

/**
 * The provider for this process (docs/07 §2). Offline when asked to, and also when
 * Gemini has no key: the demo must never break on a missing secret.
 */
export function aiProvider(): AIProvider {
  if (instance) return instance;
  const env = laviagentEnv();
  if (env.LAVIAGENT_DEMO_MODE === "offline") {
    instance = new OfflineProvider();
  } else if (env.LAVIAGENT_AI_PROVIDER === "lavieco") {
    instance = new LaviecoModelProvider();
  } else if (env.GEMINI_API_KEY) {
    instance = new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL, env.GEMINI_THINKING);
  } else {
    instance = new OfflineProvider();
  }
  return instance;
}

export const isOffline = (provider: AIProvider) => provider.id === "offline";
