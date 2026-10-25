"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, generateId } from "ai";
import { useCallback, useState } from "react";

import {
  ANALYZE_ENDPOINT,
  ANALYZE_TIMEOUT_MS,
  CHAT_ENDPOINT,
  CHAT_HISTORY_LIMIT,
} from "../constants/config";
import { TEXT } from "../constants/text";
import { analyzeResponseSchema } from "../schemas";
import type {
  AgentDataTypes,
  AgentMessage,
  AgentMessageMetadata,
  Catalog,
  ClassifyResult,
  FallbackAnswer,
  Material,
  MaterialId,
  PickReason,
} from "../types";
import { normalizeSearchText } from "../utils/normalize-search-text";
import { makeThumbnail, type PreparedImage } from "../utils/resize-image";

const t = TEXT.vi.chat;

export type ChatFailure = "rate_limited" | "too_long" | "invalid_image" | "network" | "unavailable";

/** Route errors and mid-stream errors both arrive as `{ status, reason }` JSON text. */
export function chatFailureOf(error: Error | undefined): ChatFailure | null {
  if (!error) return null;
  if (typeof navigator !== "undefined" && !navigator.onLine) return "network";
  try {
    const body: unknown = JSON.parse(error.message);
    if (body && typeof body === "object" && "reason" in body) {
      const reason = String(body.reason);
      if (reason === "rate_limited" || reason === "too_long" || reason === "invalid_image") {
        return reason;
      }
    }
  } catch {
    // Not JSON: a network failure or an unexpected stream error.
  }
  return error.name === "TypeError" ? "network" : "unavailable";
}

export const textMessage = (
  role: "user" | "assistant",
  text: string,
  metadata?: AgentMessageMetadata,
): AgentMessage => ({ id: generateId(), role, parts: [{ type: "text", text }], metadata });

const dataMessage = <K extends keyof AgentDataTypes>(
  name: K,
  data: AgentDataTypes[K],
): AgentMessage =>
  ({
    id: generateId(),
    role: "assistant",
    parts: [{ type: `data-${name}`, data }],
  }) as AgentMessage;

export const textOf = (message: AgentMessage | undefined) =>
  message?.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim() ?? "";

/** The material of the newest analysis card: what the conversation is about. */
export function currentMaterial(messages: readonly AgentMessage[]): MaterialId | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const part = messages[i]?.parts.find((item) => item.type === "data-analysis");
    if (part?.type === "data-analysis") return part.data.material;
  }
  return null;
}

/**
 * What goes to the model: the last messages only, photos replaced by a marker (the
 * analysis card already says what they showed), cards kept for the server to summarise.
 */
function forModel(messages: readonly AgentMessage[]) {
  return messages.slice(-CHAT_HISTORY_LIMIT).map((message) => ({
    ...message,
    parts: message.parts.map((part) =>
      part.type === "file" ? { type: "text" as const, text: t.photoMarker } : part,
    ),
  }));
}

type Callbacks = {
  onFailure: (failure: ChatFailure | null) => void;
  onDegraded: () => void;
  onAnalyzing: (thumbnail: string | null | false) => void;
};

/**
 * One conversation: a `Chat` for the model's answers, plus the cards LaviAgent posts
 * itself (photo analysis, samples, material chips) and recovery when an answer fails.
 * Every path ends as messages in `chat.messages`, which the history store persists.
 */
class AgentConversation {
  readonly chat: Chat<AgentMessage>;
  private ideaId: string | null;
  private recovered = false;
  private stoppedByUser = false;
  /** Learnt from the first answer: an offline demo skips the analyze call afterwards. */
  private offline = false;
  private analyzeController: AbortController | null = null;

  constructor(
    initialMessages: AgentMessage[],
    ideaId: string | null,
    private readonly catalog: Catalog,
    private readonly callbacks: Callbacks,
  ) {
    this.ideaId = ideaId;
    this.chat = new Chat<AgentMessage>({
      messages: initialMessages,
      transport: new DefaultChatTransport({
        api: CHAT_ENDPOINT,
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages: forModel(messages),
            context: {
              material: currentMaterial(messages) ?? undefined,
              ideaId: this.ideaId ?? undefined,
            },
          },
        }),
      }),
      onError: (error) => this.recover(chatFailureOf(error) ?? "unavailable"),
      onFinish: ({ message, isAbort, isDisconnect, isError }) => {
        if (this.stoppedByUser) return;
        const empty = message.role !== "assistant" || textOf(message) === "";
        if (isError || isDisconnect || isAbort || empty) {
          this.recover(isDisconnect ? "network" : "unavailable");
        } else {
          this.callbacks.onFailure(null);
        }
      },
    });
  }

  private material(id: MaterialId): Material | undefined {
    return this.catalog.materials.find((item) => item.id === id);
  }

  send(text: string) {
    this.recovered = false;
    this.stoppedByUser = false;
    this.callbacks.onFailure(null);
    void this.chat.sendMessage({ text });
  }

  stop() {
    this.stoppedByUser = true;
    this.analyzeController?.abort("cancel");
    void this.chat.stop();
  }

  /** A suggestion chip: the AI while it works, the written answer once it does not. */
  ask(suggestion: FallbackAnswer, degraded: boolean) {
    if (!degraded) {
      this.send(suggestion.question);
      return;
    }
    this.callbacks.onFailure(null);
    this.append(
      textMessage("user", suggestion.question),
      textMessage("assistant", suggestion.answer, { fallback: true }),
    );
  }

  /** Material chip or "Sửa lại": a card from fixed data, no API call. */
  pickMaterial(id: MaterialId, correction: boolean) {
    const material = this.material(id);
    if (!material) return;
    this.append(
      textMessage("user", correction ? t.correctedTo(material.name) : t.iHave(material.name)),
      dataMessage("analysis", { material: id, source: "manual", result: null }),
    );
  }

  /** "Thử với ảnh mẫu": the sample photo and its fixed result (demo fallback, no API). */
  pickSample(material: Material) {
    const result: ClassifyResult = {
      material: material.id,
      shape: material.sample.shape,
      condition: material.sample.condition,
      confidence: material.sample.confidence,
      safetyFlags: { hazardous: false, hazardKind: "none", sharpEdges: false },
    };
    this.append(
      {
        id: generateId(),
        role: "user",
        parts: [{ type: "file", mediaType: "image/jpeg", url: material.sample.image }],
      },
      dataMessage("analysis", { material: material.id, source: "sample", result }),
    );
  }

  /**
   * A photo from the composer: a thumbnail in the thread (and the history), the full
   * resized image to the analyze route only, then the card. A question typed with the
   * photo is asked right after, with the material known.
   */
  async sendPhoto(image: PreparedImage, text: string) {
    const thumbnail = await makeThumbnail(image.blob);
    this.append({
      id: generateId(),
      role: "user",
      parts: thumbnail
        ? [{ type: "file", mediaType: "image/jpeg", url: thumbnail }]
        : [{ type: "text", text: t.photoMarker }],
    });

    if (this.offline) {
      this.append(dataMessage("picker", { reason: "offline" }));
    } else {
      this.callbacks.onAnalyzing(thumbnail);
      const outcome = await this.analyze(image.blob);
      this.callbacks.onAnalyzing(false);
      if (outcome === "cancelled") return;
      this.append(outcome);
    }
    if (text) this.send(text);
  }

  private async analyze(blob: Blob): Promise<AgentMessage | "cancelled"> {
    const controller = new AbortController();
    this.analyzeController = controller;
    const timer = window.setTimeout(() => controller.abort("timeout"), ANALYZE_TIMEOUT_MS);
    const form = new FormData();
    form.append("image", blob, "photo.jpg");
    const picker = (reason: PickReason) => dataMessage("picker", { reason });
    try {
      const response = await fetch(ANALYZE_ENDPOINT, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const parsed = analyzeResponseSchema.safeParse(await response.json());
      if (!parsed.success) return picker("failed");
      if (parsed.data.status === "offline") {
        this.offline = true;
        return picker("offline");
      }
      if (parsed.data.status === "error") {
        const { reason } = parsed.data;
        if (reason === "invalid_image" || reason === "too_large") {
          return textMessage("assistant", TEXT.vi.imageErrors.invalid, { fallback: true });
        }
        return picker(reason === "rate_limited" || reason === "timeout" ? reason : "failed");
      }
      const result = parsed.data.result;
      if (result.safetyFlags.hazardous) return dataMessage("hazard", { result });
      if (result.material === "unknown") return picker("unknown");
      return dataMessage("analysis", { material: result.material, source: "ai", result });
    } catch {
      if (controller.signal.reason === "cancel") return "cancelled";
      if (controller.signal.aborted) return picker("timeout");
      return picker(navigator.onLine ? "failed" : "network");
    } finally {
      window.clearTimeout(timer);
      this.analyzeController = null;
    }
  }

  /**
   * Never leave the visitor in front of a silent or empty bubble: drop the empty answer,
   * answer from fallback-answers.json when the question is a known one, otherwise show
   * a friendly notice (the chips keep working).
   */
  private recover(failure: ChatFailure) {
    if (this.recovered) return;
    this.recovered = true;
    if (failure !== "too_long" && failure !== "invalid_image") this.callbacks.onDegraded();

    const messages = this.chat.messages;
    const last = messages.at(-1);
    // Only an empty model answer is dropped, never a card (cards have no text either).
    const emptyAnswer =
      last?.role === "assistant" &&
      textOf(last) === "" &&
      last.parts.every((part) => !part.type.startsWith("data-"));
    const kept = emptyAnswer ? messages.slice(0, -1) : messages;
    const lastUser = kept.at(-1);
    const question = lastUser?.role === "user" ? normalizeSearchText(textOf(lastUser)) : "";
    const known = question
      ? this.catalog.suggestions.find((item) => normalizeSearchText(item.question) === question)
      : undefined;

    if (known) {
      this.chat.messages = [...kept, textMessage("assistant", known.answer, { fallback: true })];
      this.callbacks.onFailure(null);
      return;
    }
    if (kept !== messages) this.chat.messages = kept;
    this.callbacks.onFailure(failure);
  }

  private append(...messages: AgentMessage[]) {
    this.chat.messages = [...this.chat.messages, ...messages];
  }
}

/**
 * The conversation on screen. Mount one per conversation id (a new `key` starts a new
 * `Chat`), with the stored messages when an old conversation is reopened.
 */
export function useConversation(
  catalog: Catalog,
  initialMessages: AgentMessage[],
  ideaId: string | null,
) {
  const [degraded, setDegraded] = useState(false);
  const [failure, setFailure] = useState<ChatFailure | null>(null);
  const [analyzing, setAnalyzing] = useState<{ thumbnail: string | null } | null>(null);
  const [conversation] = useState(
    () =>
      new AgentConversation(initialMessages, ideaId, catalog, {
        onDegraded: () => setDegraded(true),
        onFailure: setFailure,
        onAnalyzing: (thumbnail) => setAnalyzing(thumbnail === false ? null : { thumbnail }),
      }),
  );

  const ask = useCallback(
    (suggestion: FallbackAnswer) => conversation.ask(suggestion, degraded),
    [conversation, degraded],
  );
  const send = useCallback((text: string) => conversation.send(text), [conversation]);
  const sendPhoto = useCallback(
    (image: PreparedImage, text: string) => conversation.sendPhoto(image, text),
    [conversation],
  );
  const pickMaterial = useCallback(
    (id: MaterialId, correction = false) => conversation.pickMaterial(id, correction),
    [conversation],
  );
  const pickSample = useCallback(
    (material: Material) => conversation.pickSample(material),
    [conversation],
  );
  const stop = useCallback(() => conversation.stop(), [conversation]);

  return {
    chat: conversation.chat,
    failure,
    analyzing,
    ask,
    send,
    sendPhoto,
    pickMaterial,
    pickSample,
    stop,
  };
}

export type ConversationControls = ReturnType<typeof useConversation>;
