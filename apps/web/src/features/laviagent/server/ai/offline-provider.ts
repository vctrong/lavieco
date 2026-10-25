import "server-only";

import { createUIMessageStream } from "ai";

import type { ClassifyResult } from "../../types";
import { normalizeSearchText } from "../../utils/normalize-search-text";
import { staticData } from "../knowledge/catalog";
import type { AIProvider, ChatModelRequest } from "./ai-provider";

const WORD_DELAY_MS = 18;

/**
 * LAVIAGENT_DEMO_MODE=offline (or no API key): fixed data only, no network. Photos are
 * not classified (the client goes to the manual picker); chat answers the suggestion
 * chips from fallback-answers.json and a default line otherwise.
 */
export class OfflineProvider implements AIProvider {
  readonly id = "offline";

  async classifyImage(): Promise<ClassifyResult> {
    return {
      material: "unknown",
      shape: "",
      condition: "",
      confidence: 0,
      safetyFlags: { hazardous: false, hazardKind: "none", sharpEdges: false },
    };
  }

  chatStream(request: ChatModelRequest, { signal }: { signal: AbortSignal }) {
    const answer = cannedAnswer(request);
    return createUIMessageStream({
      execute: async ({ writer }) => {
        const id = "offline-text";
        // The assistant message must start before any of its parts (UI message stream protocol).
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id });
        // Word by word, so the demo shows the same typing rhythm as the real model.
        for (const word of answer.split(/(?<=\s)/)) {
          if (signal.aborted) break;
          writer.write({ type: "text-delta", id, delta: word });
          await new Promise((resolve) => setTimeout(resolve, WORD_DELAY_MS));
        }
        writer.write({ type: "text-end", id });
      },
    });
  }
}

export function cannedAnswer(request: ChatModelRequest): string {
  const { fallback } = staticData();
  const last = request.turns.findLast((turn) => turn.role === "user");
  const question = normalizeSearchText(last?.text ?? "");
  const match = fallback.suggestions.find(
    (item) => normalizeSearchText(item.question) === question,
  );
  return match?.answer ?? fallback.offlineDefault;
}
