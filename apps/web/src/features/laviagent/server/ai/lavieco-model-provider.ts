import "server-only";

import type { ClassifyResult } from "../../types";
import type { AIProvider } from "./ai-provider";

/**
 * TODO(laviagent-own-model): LAVIECO's own, self-hosted model (docs/07 §6).
 *
 * The plan: a vision classifier fine-tuned on photos the team labels (the five
 * materials + hazardous items), and a small instruction-tuned chat model served behind
 * an OpenAI-compatible endpoint (vLLM / llama.cpp / Ollama) on the private network.
 * Implement both methods here: `classifyImage` posts the image and maps the answer to
 * `ClassifyResult`; `chatStream` can reuse `streamText` with
 * `@ai-sdk/openai-compatible` and `toUIMessageStream`, exactly like GeminiProvider.
 * Then set LAVIAGENT_AI_PROVIDER=lavieco. No UI or route changes are needed.
 */
export class LaviecoModelProvider implements AIProvider {
  readonly id = "lavieco";

  async classifyImage(): Promise<ClassifyResult> {
    throw new Error("LaviecoModelProvider is not implemented yet");
  }

  chatStream(): never {
    throw new Error("LaviecoModelProvider is not implemented yet");
  }
}
