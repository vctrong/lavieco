"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, generateId, type UIMessage } from "ai";
import { useCallback, useEffect, useState } from "react";

import { CHAT_ENDPOINT } from "../constants/config";
import type { ChatContext, FallbackAnswer } from "../types";

/** Marks answers written in advance (chips while the AI is unavailable). */
export type AgentMessageMetadata = { fallback?: boolean };
export type AgentMessage = UIMessage<AgentMessageMetadata>;

export type ChatFailure = "rate_limited" | "too_long" | "invalid_image" | "network" | "unavailable";

/** useChat surfaces the route's JSON body (or the stream's error text) as the message. */
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
    // Not JSON: a network failure or a stream error.
  }
  return error.name === "TypeError" ? "network" : "unavailable";
}

const textMessage = (
  role: "user" | "assistant",
  text: string,
  metadata?: AgentMessageMetadata,
): AgentMessage => ({ id: generateId(), role, parts: [{ type: "text", text }], metadata });

/**
 * A `Chat` plus what it needs outside React's render: the page context sent with each
 * request, and the suggestion chip waiting for an answer (answered from
 * fallback-answers.json if the request fails).
 */
class AgentConversation {
  readonly chat: Chat<AgentMessage>;
  private context: ChatContext = {};
  private pendingChip: FallbackAnswer | null = null;

  constructor(onDegraded: () => void) {
    this.chat = new Chat<AgentMessage>({
      transport: new DefaultChatTransport({
        api: CHAT_ENDPOINT,
        body: () => ({ context: this.context }),
      }),
      onError: (error) => {
        const failure = chatFailureOf(error);
        if (failure !== "too_long" && failure !== "invalid_image") onDegraded();
        const chip = this.pendingChip;
        this.pendingChip = null;
        if (chip) this.append(textMessage("assistant", chip.answer, { fallback: true }));
      },
      onFinish: () => {
        this.pendingChip = null;
      },
    });
  }

  setContext(context: ChatContext) {
    this.context = context;
  }

  /** A suggestion chip: the AI while it works, the written answer once it does not. */
  ask(suggestion: FallbackAnswer, degraded: boolean) {
    if (degraded) {
      this.append(
        textMessage("user", suggestion.question),
        textMessage("assistant", suggestion.answer, { fallback: true }),
      );
      return;
    }
    this.pendingChip = suggestion;
    void this.chat.sendMessage({ text: suggestion.question });
  }

  private append(...messages: AgentMessage[]) {
    this.chat.messages = [...this.chat.messages, ...messages];
  }
}

/**
 * One conversation per screen, shared by the desktop panel and the mobile sheet so
 * switching layouts never loses it.
 */
export function useAgentChat(context: ChatContext) {
  const [degraded, setDegraded] = useState(false);
  const [conversation] = useState(() => new AgentConversation(() => setDegraded(true)));

  const { material, ideaId } = context;
  useEffect(() => {
    conversation.setContext({ material, ideaId });
  }, [conversation, material, ideaId]);

  const ask = useCallback(
    (suggestion: FallbackAnswer) => conversation.ask(suggestion, degraded),
    [conversation, degraded],
  );

  return { chat: conversation.chat, degraded, ask };
}
