"use client";

import { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";

import { handbookVideoEmbedUrl } from "@lavieco/shared/content";

import { TEXT } from "../../constants/text";

const v = TEXT.vi.video;

/**
 * A video hotspot plays here: YouTube from youtube-nocookie.com, or TikTok, the only
 * frame sources the handbook pages allow (CSP in proxy.ts). Esc or the scrim closes it.
 */
export function VideoDialog({
  provider,
  videoId,
  label,
  onClose,
}: {
  provider: "youtube" | "tiktok";
  videoId: string;
  label: string;
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus();
    return () => opener?.focus();
  }, []);
  const vertical = provider === "tiktok";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label={v.close}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-scrim-solid"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={v.frameTitle(label)}
        className="relative w-full max-w-4xl"
        style={vertical ? { maxWidth: "min(24rem, 100%)" } : undefined}
      >
        <button
          ref={close}
          type="button"
          onClick={onClose}
          aria-label={v.close}
          className="absolute -top-14 right-0 grid size-11 place-items-center rounded-full bg-soft-white text-deep-blue shadow-ambient"
        >
          <FiX aria-hidden="true" size={20} />
        </button>
        <div
          className="overflow-hidden rounded-2xl bg-charcoal shadow-gallery"
          style={{ aspectRatio: vertical ? "9 / 16" : "16 / 9", maxHeight: "80dvh" }}
        >
          <iframe
            src={handbookVideoEmbedUrl({ provider, id: videoId })}
            title={v.frameTitle(label)}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
