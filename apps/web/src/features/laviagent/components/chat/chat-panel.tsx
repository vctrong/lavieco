"use client";

import { useChat } from "@ai-sdk/react";
import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { FiAlertCircle, FiImage, FiLock, FiSend, FiSquare, FiX } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { LaviAgentMascot } from "@/shared/components/illustrations/laviagent-mascot";

import { ACCEPTED_IMAGE_TYPES, CHAT_MESSAGE_MAX_CHARS } from "../../constants/config";
import { TEXT } from "../../constants/text";
import type { AgentChatControls } from "../../hooks/use-agent-chat";
import type { Catalog } from "../../types";
import { blobToDataUrl, prepareImage } from "../../utils/resize-image";
import { AgentBubble, MessageBubble } from "./message-bubble";
import { MarkdownText } from "./markdown-text";
import { TypingDots } from "./typing-dots";

const t = TEXT.vi.chat;

type ChatPanelProps = {
  /** From useAgentChat: the conversation and its recovery when an answer fails. */
  controls: AgentChatControls;
  catalog: Catalog;
  /** Name of the material on screen, for the welcome line. */
  materialName: string | null;
  /** Extra header buttons (the mobile sheet adds expand / close). */
  actions?: ReactNode;
  className?: string;
};

/**
 * The conversation: header, log (aria-live), suggestion chips and the composer. Layout
 * agnostic: the desktop split view and the mobile sheet both host it.
 */
export function ChatPanel({ controls, catalog, materialName, actions, className }: ChatPanelProps) {
  const { chat, failure, ask, send: sendMessage, stop } = controls;
  const { messages, status } = useChat({ chat, throttle: 50 });
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const known = useMemo(
    () => ({
      ideas: new Set(catalog.ideas.map((idea) => idea.id)),
      kits: new Set(catalog.kits.map((kit) => kit.id)),
    }),
    [catalog],
  );

  const busy = status === "submitted" || status === "streaming";
  // Set by the conversation when an answer failed and no written answer could replace it.
  const showFailure = failure !== null && !busy;
  const rateLimited = failure === "rate_limited";

  // Follow the conversation while it grows.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, status]);

  const send = () => {
    const text = input.trim();
    if (busy || (!text && !attachment)) return;
    if (text.length > CHAT_MESSAGE_MAX_CHARS) {
      setLocalError(t.tooLong(CHAT_MESSAGE_MAX_CHARS));
      return;
    }
    setLocalError(null);
    const files = attachment
      ? [{ type: "file" as const, mediaType: "image/jpeg", url: attachment, filename: "anh.jpg" }]
      : undefined;
    setInput("");
    setAttachment(null);
    sendMessage({ text, files });
  };

  const attach = async (file: File | undefined) => {
    if (!file) return;
    const prepared = await prepareImage(file);
    if (typeof prepared === "string") {
      setLocalError(t.errors.invalid_image);
      return;
    }
    setLocalError(null);
    setAttachment(await blobToDataUrl(prepared.blob));
    URL.revokeObjectURL(prepared.url);
  };

  return (
    <section
      aria-label={t.title}
      className={cn("flex min-h-0 flex-col bg-soft-white text-charcoal", className)}
    >
      <header className="flex items-center gap-3 border-b border-hairline px-4 py-3">
        <LaviAgentMascot className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight text-deep-blue">
            {TEXT.vi.name}
            <span className="ml-1.5 inline-flex rounded-full bg-canary px-1.5 align-middle text-[10px] font-bold text-charcoal">
              {TEXT.vi.aiBadge}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-xs text-charcoal/65">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-brand" />
            {t.status}
          </p>
        </div>
        {actions}
      </header>

      <ol
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label={t.logLabel}
        className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5"
      >
        <AgentBubble>
          <MarkdownText text={t.welcome(materialName)} />
        </AgentBubble>
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            catalog={catalog}
            known={known}
            streaming={busy && index === messages.length - 1}
          />
        ))}
        {status === "submitted" ? (
          <AgentBubble>
            <TypingDots />
          </AgentBubble>
        ) : null}
      </ol>

      {showFailure || localError ? (
        <p
          role="alert"
          className="mx-4 mb-2 flex gap-2 rounded-2xl border border-canary bg-canary/15 px-3 py-2 text-xs leading-relaxed text-charcoal"
        >
          <FiAlertCircle aria-hidden="true" size={14} className="mt-0.5 shrink-0 text-deep-blue" />
          {localError ?? (failure ? t.errors[failure] : null)}
        </p>
      ) : null}

      <div className="border-t border-hairline px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div
          role="group"
          aria-label={t.suggestionsLabel}
          className="-mx-4 mb-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
        >
          {catalog.suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              disabled={busy}
              onClick={() => ask(suggestion)}
              className="min-h-11 shrink-0 snap-start whitespace-nowrap rounded-full border border-hairline bg-soft-white px-3.5 text-xs font-medium text-deep-blue transition-colors hover:border-emerald-brand hover:bg-mint-mist disabled:opacity-50"
            >
              {suggestion.question}
            </button>
          ))}
        </div>

        {attachment ? (
          <div className="mb-2 flex items-center gap-2">
            <Image
              src={attachment}
              alt={t.attachmentAlt}
              width={48}
              height={48}
              unoptimized
              className="size-12 rounded-xl border border-hairline object-cover"
            />
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="flex size-11 items-center justify-center rounded-full text-charcoal/70 hover:bg-mint-mist"
              aria-label={t.removeAttachment}
            >
              <FiX aria-hidden="true" size={16} />
            </button>
          </div>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
          className="flex items-end gap-2 rounded-[1.75rem] border border-hairline bg-soft-white p-1.5 focus-within:border-emerald-brand focus-within:shadow-[0_0_0_3px_var(--color-neon-glow)]"
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              void attach(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={rateLimited}
            aria-label={t.attach}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-deep-blue transition-colors hover:bg-mint-mist disabled:opacity-40"
          >
            <FiImage aria-hidden="true" size={18} />
          </button>
          <label htmlFor={inputId} className="sr-only">
            {t.inputLabel}
          </label>
          <textarea
            id={inputId}
            value={input}
            rows={1}
            maxLength={CHAT_MESSAGE_MAX_CHARS + 50}
            disabled={rateLimited}
            placeholder={t.placeholder}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send();
              }
            }}
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-1 py-2.5 text-base leading-snug text-charcoal outline-none [field-sizing:content] placeholder:text-charcoal/45 sm:text-sm"
          />
          {busy ? (
            <button
              type="button"
              onClick={stop}
              aria-label={t.stop}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-deep-blue text-soft-white"
            >
              <FiSquare aria-hidden="true" size={14} />
            </button>
          ) : (
            <button
              type="submit"
              aria-label={t.send}
              disabled={rateLimited || (!input.trim() && !attachment)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-brand text-charcoal shadow-emerald-cta-sm transition-[opacity,scale] hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
            >
              <FiSend aria-hidden="true" size={16} />
            </button>
          )}
        </form>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-charcoal/50">
          <FiLock aria-hidden="true" size={11} />
          {t.privacy} {t.disclaimer}
        </p>
      </div>
    </section>
  );
}
