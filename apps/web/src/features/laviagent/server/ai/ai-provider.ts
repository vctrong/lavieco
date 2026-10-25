import "server-only";

import type { UIMessageChunk } from "ai";

import type { ClassifyResult } from "../../types";
import type { ChatKnowledge } from "../knowledge/knowledge-source";

/**
 * The only seam between LaviAgent and a model (docs/07 §2). The UI and the route
 * handlers never know which provider answers: Gemini today, LAVIECO's own model later.
 */
export type AIProvider = {
  readonly id: string;
  /** Model name, for logs (e.g. a 404 when GEMINI_MODEL is retired). */
  readonly model?: string;
  classifyImage(image: ImageInput, options: CallOptions): Promise<ClassifyResult>;
  /**
   * Streams the assistant's reply in the UI message stream protocol (`text-*` chunks),
   * which `useChat` reads. A self-hosted model can produce the same chunks with
   * `createUIMessageStream` without touching the client.
   */
  chatStream(request: ChatModelRequest, options: CallOptions): ReadableStream<UIMessageChunk>;
};

export type ImageInput = {
  /** Validated by magic bytes before it reaches a provider. */
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  bytes: Uint8Array;
};

export type CallOptions = { signal: AbortSignal };

/** One turn of the conversation, provider-neutral. Only the latest user turn keeps its image. */
export type ChatTurn = {
  role: "user" | "assistant";
  text: string;
  image?: ImageInput;
};

export type ChatModelRequest = {
  /** System prompt + knowledge context, built by prompts/build-chat-prompt.ts. */
  instructions: string;
  turns: ChatTurn[];
  /** Raw context, for providers that answer without a model (offline). */
  knowledge: ChatKnowledge;
};
