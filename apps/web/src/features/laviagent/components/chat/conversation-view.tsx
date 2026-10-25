"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import { ACCEPTED_IMAGE_TYPES } from "../../constants/config";
import { TEXT } from "../../constants/text";
import { textOf, useConversation } from "../../hooks/use-conversation";
import type { AgentMessage, Catalog } from "../../types";
import { prefersNativeCapture } from "../../utils/camera";
import { prepareImage, type PrepareFailure, type PreparedImage } from "../../utils/resize-image";
import type { CardActions } from "../cards";
import { AnalyzingBubble } from "./analyzing-bubble";
import { Composer } from "./composer";
import { EmptyState } from "./empty-state";
import { AgentBubble, MessageBubble } from "./message-bubble";
import { TypingDots } from "./typing-dots";
import { WebcamDialog } from "./webcam-dialog";

const t = TEXT.vi;

const IMAGE_NOTICE: Record<PrepareFailure, string> = {
  invalid: t.imageErrors.invalid,
  heic: t.imageErrors.heic,
  too_large: t.imageErrors.tooLarge,
};

/** The photo (thumbnail or sample) of the user message just before `index`, if any. */
function photoBefore(messages: readonly AgentMessage[], index: number): string | null {
  const previous = messages[index - 1];
  if (previous?.role !== "user") return null;
  const file = previous.parts.find((part) => part.type === "file");
  return file?.type === "file" ? file.url : null;
}

/** Changes when something worth saving changed (not on every streamed token). */
const persistKey = (messages: readonly AgentMessage[]) => {
  const last = messages.at(-1);
  return `${messages.length}:${last?.id ?? ""}:${textOf(last).length}:${last?.parts.length ?? 0}`;
};

type ConversationViewProps = {
  catalog: Catalog;
  conversationId: string;
  initialMessages: AgentMessage[];
  ideaId: string | null;
  /** Called after each settled change (never mid-stream). */
  onPersist: (messages: AgentMessage[]) => void;
};

/**
 * One conversation: the thread (or the empty state) and the composer pinned under it.
 * Mounted with a `key` per conversation, so switching conversations starts afresh.
 */
export function ConversationView({
  catalog,
  conversationId,
  initialMessages,
  ideaId,
  onPersist,
}: ConversationViewProps) {
  const controls = useConversation(catalog, initialMessages, ideaId);
  const { messages, status } = useChat({ chat: controls.chat, throttle: 50 });
  const [attachment, setAttachment] = useState<PreparedImage | null>(null);
  const [imageNotice, setImageNotice] = useState<PrepareFailure | null>(null);
  const [dragging, setDragging] = useState(false);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const savedKey = useRef(persistKey(initialMessages));

  const streaming = status === "submitted" || status === "streaming";
  const busy = streaming || controls.analyzing !== null;

  const known = useMemo(
    () => ({
      ideas: new Set(catalog.ideas.map((idea) => idea.id)),
      kits: new Set(catalog.kits.map((kit) => kit.id)),
    }),
    [catalog],
  );

  // Save settled conversations only; a reopened one is not re-saved (nor re-dated).
  useEffect(() => {
    if (busy || messages.length === 0) return;
    const key = persistKey(messages);
    if (key === savedKey.current) return;
    const timer = window.setTimeout(() => {
      savedKey.current = key;
      onPersist(messages);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [busy, messages, onPersist]);

  // Follow the conversation while it grows.
  useEffect(() => {
    const log = logRef.current;
    if (log && messages.length > 0) log.scrollTop = log.scrollHeight;
  }, [messages, status, controls.analyzing]);

  // The preview URL lives as long as the attachment.
  useEffect(
    () => () => {
      if (attachment) URL.revokeObjectURL(attachment.url);
    },
    [attachment],
  );

  const takeFile = async (file: File | undefined) => {
    if (!file) return;
    const prepared = await prepareImage(file);
    if (typeof prepared === "string") {
      setImageNotice(prepared);
      return;
    }
    setImageNotice(null);
    setAttachment(prepared);
  };

  const submit = (text: string) => {
    setImageNotice(null);
    if (attachment) {
      void controls.sendPhoto(attachment, text);
      setAttachment(null);
    } else if (text) {
      controls.send(text);
    }
  };

  // Phones: the camera app through `capture`. Laptops: the webcam dialog.
  const openCamera = () => {
    if (prefersNativeCapture()) cameraRef.current?.click();
    else setWebcamOpen(true);
  };
  const openGallery = () => galleryRef.current?.click();

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void takeFile(event.dataTransfer.files[0]);
  };

  const actions: CardActions = {
    conversationId,
    onPickMaterial: controls.pickMaterial,
    onPickSample: controls.pickSample,
    disabled: busy,
  };

  const notice = imageNotice
    ? IMAGE_NOTICE[imageNotice]
    : controls.failure && !busy
      ? t.chat.errors[controls.failure]
      : null;

  const fileInput = (ref: typeof cameraRef, capture: boolean) => (
    <input
      ref={ref}
      type="file"
      accept={ACCEPTED_IMAGE_TYPES}
      // `capture` opens the camera directly on phones; desktops fall back to a file picker.
      {...(capture ? { capture: "environment" as const } : {})}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(event) => {
        void takeFile(event.target.files?.[0]);
        event.target.value = "";
      }}
    />
  );

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false);
      }}
      onDrop={onDrop}
    >
      {fileInput(cameraRef, true)}
      {fileInput(galleryRef, false)}

      <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {messages.length === 0 && !controls.analyzing ? (
          <EmptyState
            catalog={catalog}
            dragging={dragging}
            onOpenCamera={openCamera}
            onOpenGallery={openGallery}
            onPickMaterial={(material) => controls.pickMaterial(material)}
            onPickSample={controls.pickSample}
            onAsk={controls.ask}
          />
        ) : (
          <ol
            role="log"
            aria-live="polite"
            aria-label={t.chat.logLabel}
            className="mx-auto w-full max-w-3xl space-y-5 px-3 py-6 sm:px-4"
          >
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                catalog={catalog}
                known={known}
                streaming={streaming && index === messages.length - 1}
                actions={actions}
                photo={photoBefore(messages, index)}
              />
            ))}
            {controls.analyzing ? (
              <AnalyzingBubble thumbnail={controls.analyzing.thumbnail} onCancel={controls.stop} />
            ) : null}
            {status === "submitted" ? (
              <AgentBubble>
                <TypingDots />
              </AgentBubble>
            ) : null}
          </ol>
        )}
      </div>

      {dragging && messages.length > 0 ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-[1.75rem] border-2 border-dashed border-emerald-brand bg-mint-mist/80 font-display text-2xl text-deep-blue"
        >
          {t.chat.dropOverlay}
        </div>
      ) : null}

      <WebcamDialog
        open={webcamOpen}
        onClose={() => setWebcamOpen(false)}
        onCapture={(file) => void takeFile(file)}
        onFallback={openGallery}
      />

      <Composer
        attachment={attachment}
        onRemoveAttachment={() => setAttachment(null)}
        onOpenCamera={openCamera}
        onOpenGallery={openGallery}
        onSubmit={submit}
        onStop={controls.stop}
        busy={busy}
        locked={controls.failure === "rate_limited"}
        notice={notice}
      />
    </div>
  );
}
