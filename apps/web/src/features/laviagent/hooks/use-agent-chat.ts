"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, generateId, type UIMessage } from "ai";
import { useCallback, useEffect, useState } from "react";

import { CHAT_ENDPOINT } from "../constants/config";
import type { ChatContext, FallbackAnswer } from "../types";
import { normalizeSearchText } from "../utils/normalize-search-text";

/** Marks answers written in advance (chips while the AI is unavailable). */
export type AgentMessageMetadata = { fallback?: boolean };
export type AgentMessage = UIMessage<AgentMessageMetadata>;

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

const textMessage = (
  role: "user" | "assistant",
  text: string,
  metadata?: AgentMessageMetadata,
): AgentMessage => ({ id: generateId(), role, parts: [{ type: "text", text }], metadata });

const textOf = (message: AgentMessage | undefined) =>
  message?.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim() ?? "";

type Callbacks = {
  onDegraded: () => void;
  onFailure: (failure: ChatFailure | null) => void;
};

/**
 * A `Chat` plus what it needs outside React's render: the page context sent with each
 * request, and recovery when an answer fails. A failure can come as a refused request,
 * an `error` chunk mid-stream (the model failed after the response started), a dropped
 * connection, or an answer that ended empty; all of them end in `recover`.
 */
class AgentConversation {
  readonly chat: Chat<AgentMessage>;
  private context: ChatContext = {};
  /** The current request already recovered (onError and onFinish both fire on errors). */
  private recovered = false;
  private stoppedByUser = false;

  constructor(
    private readonly suggestions: readonly FallbackAnswer[],
    private readonly callbacks: Callbacks,
  ) {
    this.chat = new Chat<AgentMessage>({
      transport: new DefaultChatTransport({
        api: CHAT_ENDPOINT,
        body: () => ({ context: this.context }),
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

  setContext(context: ChatContext) {
    this.context = context;
  }

  send(message: Parameters<Chat<AgentMessage>["sendMessage"]>[0]) {
    this.recovered = false;
    this.stoppedByUser = false;
    this.callbacks.onFailure(null);
    void this.chat.sendMessage(message);
  }

  stop() {
    this.stoppedByUser = true;
    void this.chat.stop();
  }

  /** A suggestion chip: the AI while it works, the written answer once it does not. */
  ask(suggestion: FallbackAnswer, degraded: boolean) {
    if (degraded) {
      this.callbacks.onFailure(null);
      this.append(
        textMessage("user", suggestion.question),
        textMessage("assistant", suggestion.answer, { fallback: true }),
      );
      return;
    }
    this.send({ text: suggestion.question });
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
    const kept =
      last?.role === "assistant" && textOf(last) === "" ? messages.slice(0, -1) : messages;
    const question = kept.at(-1)?.role === "user" ? normalizeSearchText(textOf(kept.at(-1))) : "";
    const known = question
      ? this.suggestions.find((item) => normalizeSearchText(item.question) === question)
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
 * One conversation per screen, shared by the desktop panel and the mobile sheet so
 * switching layouts never loses it.
 */
export function useAgentChat(context: ChatContext, suggestions: readonly FallbackAnswer[]) {
  const [degraded, setDegraded] = useState(false);
  const [failure, setFailure] = useState<ChatFailure | null>(null);
  const [conversation] = useState(
    () =>
      new AgentConversation(suggestions, {
        onDegraded: () => setDegraded(true),
        onFailure: setFailure,
      }),
  );

  const { material, ideaId } = context;
  useEffect(() => {
    conversation.setContext({ material, ideaId });
  }, [conversation, material, ideaId]);

  const ask = useCallback(
    (suggestion: FallbackAnswer) => conversation.ask(suggestion, degraded),
    [conversation, degraded],
  );
  const send = useCallback(
    (message: Parameters<AgentConversation["send"]>[0]) => conversation.send(message),
    [conversation],
  );
  const stop = useCallback(() => conversation.stop(), [conversation]);

  return { chat: conversation.chat, failure, ask, send, stop };
}

export type AgentChatControls = ReturnType<typeof useAgentChat>;
