"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { FiAlertCircle, FiCamera, FiImage, FiSend, FiSquare, FiX } from "react-icons/fi";

import { CHAT_MESSAGE_MAX_CHARS } from "../../constants/config";
import { TEXT } from "../../constants/text";
import type { PreparedImage } from "../../utils/resize-image";

const t = TEXT.vi.chat;

const ICON_BUTTON =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-deep-blue transition-colors hover:bg-mint-mist disabled:opacity-40";

type ComposerProps = {
  attachment: PreparedImage | null;
  onRemoveAttachment: () => void;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
  /** Text (possibly empty when a photo is attached). */
  onSubmit: (text: string) => void;
  onStop: () => void;
  busy: boolean;
  /** Rate limited: typing is paused, chips and cards still work. */
  locked: boolean;
  /** A friendly notice (failure, image problem), shown above the field. */
  notice: string | null;
};

/**
 * Always at the bottom of the conversation: gallery, camera, the field and send. A
 * picked photo waits here as a preview (the "review" step) until it is sent.
 */
export function Composer({
  attachment,
  onRemoveAttachment,
  onOpenCamera,
  onOpenGallery,
  onSubmit,
  onStop,
  busy,
  locked,
  notice,
}: ComposerProps) {
  const [input, setInput] = useState("");
  const [tooLong, setTooLong] = useState(false);
  const inputId = useId();

  const submit = () => {
    const text = input.trim();
    if (busy || (!text && !attachment)) return;
    if (text.length > CHAT_MESSAGE_MAX_CHARS) {
      setTooLong(true);
      return;
    }
    setTooLong(false);
    setInput("");
    onSubmit(text);
  };

  const message = tooLong ? t.tooLong(CHAT_MESSAGE_MAX_CHARS) : notice;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-4">
      {message ? (
        <p
          role="alert"
          className="mb-2 flex gap-2 rounded-2xl border border-canary bg-canary/15 px-3 py-2 text-xs leading-relaxed text-charcoal"
        >
          <FiAlertCircle aria-hidden="true" size={14} className="mt-0.5 shrink-0 text-deep-blue" />
          {message}
        </p>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="rounded-[1.75rem] border border-hairline bg-soft-white p-1.5 shadow-ambient focus-within:border-emerald-brand focus-within:shadow-[0_0_0_3px_var(--color-neon-glow)]"
      >
        {attachment ? (
          <div className="flex items-center gap-2 px-2 pb-1 pt-1.5">
            <Image
              src={attachment.url}
              alt={t.attachmentAlt}
              width={56}
              height={56}
              unoptimized
              className="size-14 rounded-xl border border-hairline object-cover"
            />
            <button
              type="button"
              onClick={onRemoveAttachment}
              aria-label={t.removeAttachment}
              className={ICON_BUTTON}
            >
              <FiX aria-hidden="true" size={16} />
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-0.5">
          <button
            type="button"
            onClick={onOpenGallery}
            disabled={busy}
            aria-label={t.attach}
            className={ICON_BUTTON}
          >
            <FiImage aria-hidden="true" size={18} />
          </button>
          <button
            type="button"
            onClick={onOpenCamera}
            disabled={busy}
            aria-label={t.camera}
            className={ICON_BUTTON}
          >
            <FiCamera aria-hidden="true" size={18} />
          </button>
          <label htmlFor={inputId} className="sr-only">
            {t.inputLabel}
          </label>
          <textarea
            id={inputId}
            value={input}
            rows={1}
            maxLength={CHAT_MESSAGE_MAX_CHARS + 50}
            disabled={locked && !attachment}
            placeholder={attachment ? t.placeholderWithPhoto : t.placeholder}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit();
              }
            }}
            // 16px on phones: smaller text makes iOS zoom into the field.
            className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-2.5 text-base leading-snug text-charcoal outline-none [field-sizing:content] placeholder:text-charcoal/45 sm:text-sm"
          />
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label={t.stop}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-deep-blue text-soft-white"
            >
              <FiSquare aria-hidden="true" size={14} />
            </button>
          ) : (
            <button
              type="submit"
              aria-label={t.send}
              disabled={!input.trim() && !attachment}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-brand text-charcoal shadow-emerald-cta-sm transition-[opacity,scale] hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
            >
              <FiSend aria-hidden="true" size={16} />
            </button>
          )}
        </div>
      </form>
      <p className="mt-1.5 text-center text-[11px] leading-snug text-charcoal/50">{t.disclaimer}</p>
    </div>
  );
}
