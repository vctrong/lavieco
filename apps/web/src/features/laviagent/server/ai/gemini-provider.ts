import "server-only";

import { createGoogle, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { generateText, Output, streamText, toUIMessageStream, type ModelMessage } from "ai";
import { z } from "zod";

import { HAZARD_KINDS, detectedMaterialSchema } from "../../schemas";
import type { ClassifyResult } from "../../types";
import { logProviderError } from "../log";
import { CLASSIFY_PROMPT } from "../prompts/classify-prompt";
import type {
  AIProvider,
  CallOptions,
  ChatModelRequest,
  ChatTurn,
  ImageInput,
} from "./ai-provider";

/** Flat on purpose: the simplest JSON schema is the most reliable with structured output. */
const modelAnswerSchema = z.object({
  material: detectedMaterialSchema,
  shape: z.string(),
  condition: z.string(),
  confidence: z.number(),
  hazardous: z.boolean(),
  hazardKind: z.enum(HAZARD_KINDS),
  sharpEdges: z.boolean(),
});

const CHAT_MAX_OUTPUT_TOKENS = 700;
const clip = (value: string, max: number) => value.trim().slice(0, max);

/**
 * What the browser receives when the model fails mid-stream: the same JSON shape as the
 * route's own errors, so the client maps both to one friendly message (chatFailureOf).
 */
export const STREAM_ERROR_TEXT = JSON.stringify({ status: "error", reason: "unavailable" });

/** Google Gemini through the AI SDK. Key and model come from env (docs/06), never the client. */
export class GeminiProvider implements AIProvider {
  readonly id = "gemini";
  private readonly google;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.google = createGoogle({ apiKey });
  }

  /**
   * Speed over depth: classification and short chat answers do not need long thinking.
   * Gemini 2.5 takes a token budget, later generations a level.
   */
  private providerOptions(): { google: GoogleLanguageModelOptions } {
    const thinkingConfig = this.model.startsWith("gemini-2.5")
      ? { thinkingBudget: 0 }
      : { thinkingLevel: "low" as const };
    return { google: { thinkingConfig } };
  }

  async classifyImage(image: ImageInput, { signal }: CallOptions): Promise<ClassifyResult> {
    const { output } = await generateText({
      model: this.google(this.model),
      instructions: CLASSIFY_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "file", data: image.bytes, mediaType: image.mediaType },
            { type: "text", text: "Phân loại món đồ trong ảnh." },
          ],
        },
      ],
      output: Output.object({ schema: modelAnswerSchema }),
      temperature: 0,
      maxRetries: 0,
      abortSignal: signal,
      providerOptions: this.providerOptions(),
    });
    return {
      material: output.material,
      shape: clip(output.shape, 120),
      condition: clip(output.condition, 120),
      confidence: Math.min(1, Math.max(0, output.confidence)),
      safetyFlags: {
        hazardous: output.hazardous,
        hazardKind: output.hazardous ? output.hazardKind : "none",
        sharpEdges: output.sharpEdges,
      },
    };
  }

  chatStream(request: ChatModelRequest, { signal }: CallOptions) {
    const result = streamText({
      model: this.google(this.model),
      instructions: request.instructions,
      messages: request.turns.map(toModelMessage),
      temperature: 0.6,
      maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
      maxRetries: 1,
      abortSignal: signal,
      providerOptions: this.providerOptions(),
    });
    // Errors after the response started (a retired model's 404, quota, network) become an
    // `error` chunk: logged here with their status, sent to the browser without details.
    return toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        logProviderError("chat", this, error);
        return STREAM_ERROR_TEXT;
      },
    });
  }
}

function toModelMessage(turn: ChatTurn): ModelMessage {
  if (turn.role === "assistant") return { role: "assistant", content: turn.text };
  return {
    role: "user",
    content: [
      ...(turn.image
        ? [{ type: "file" as const, data: turn.image.bytes, mediaType: turn.image.mediaType }]
        : []),
      { type: "text" as const, text: turn.text || "Bạn xem giúp mình món đồ trong ảnh nhé." },
    ],
  };
}
