"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { TEXT } from "../../constants/text";
import { AgentBubble } from "./message-bubble";

const t = TEXT.vi.analyzing;
const MESSAGE_INTERVAL_MS = 1_800;

/** While the photo is analysed: its thumbnail under a scan line, and rotating status lines. */
export function AnalyzingBubble({
  thumbnail,
  onCancel,
}: {
  thumbnail: string | null;
  onCancel: () => void;
}) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % t.messages.length),
      MESSAGE_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <AgentBubble>
      <div className="flex items-center gap-3" aria-busy="true">
        {thumbnail ? (
          <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-mint-mist">
            <Image
              src={thumbnail}
              alt={t.imageAlt}
              fill
              sizes="64px"
              unoptimized
              className="object-cover"
            />
            <span aria-hidden="true" className="absolute inset-0 bg-emerald-brand/10" />
            {/* Under reduced motion the sweep stops; the status line still says what happens. */}
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-0.5 animate-scan-sweep bg-emerald-brand shadow-neon-emerald"
            />
          </span>
        ) : null}
        <div className="min-w-0">
          <p role="status" className="text-sm text-emerald-ink">
            {t.messages[index]}
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="mt-1 min-h-11 text-sm font-semibold text-deep-blue underline underline-offset-4"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </AgentBubble>
  );
}
