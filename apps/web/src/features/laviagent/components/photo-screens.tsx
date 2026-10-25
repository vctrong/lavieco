"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { FiRefreshCw, FiZap } from "react-icons/fi";

import { Button, Eyebrow, cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import type { FlowImage } from "../hooks/use-agent-flow";
import { BAR_BUTTON, BAR_PRIMARY, BAR_SECONDARY, BOTTOM_BAR } from "./styles";

const t = TEXT.vi;
const MESSAGE_INTERVAL_MS = 1_800;

/** The photo in an arch frame; `children` overlays it (the scan line). */
const FRAME_SIZES = {
  lg: "max-w-md rounded-t-[7rem] sm:rounded-t-[9rem]",
  sm: "max-w-[220px] rounded-t-[5rem] sm:max-w-none",
} as const;

export function PhotoFrame({
  image,
  alt,
  size = "lg",
  children,
}: {
  image: FlowImage;
  alt: string;
  size?: keyof typeof FRAME_SIZES;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[4/5] w-full overflow-hidden rounded-b-[1.5rem] border border-hairline bg-mint-mist shadow-hero-arch-soft",
        FRAME_SIZES[size],
      )}
    >
      <Image
        src={image.url}
        alt={alt}
        fill
        sizes={size === "lg" ? "(min-width: 640px) 448px, 92vw" : "220px"}
        // Uploads are local object URLs: nothing for the optimizer to fetch.
        unoptimized={image.kind === "upload"}
        className="object-cover"
      />
      {children}
    </div>
  );
}

type ReviewScreenProps = {
  image: FlowImage;
  onRetake: () => void;
  onAnalyze: () => void;
};

export function ReviewScreen({ image, onRetake, onAnalyze }: ReviewScreenProps) {
  return (
    <div className="mx-auto max-w-xl pb-28 text-center md:pb-0">
      <Eyebrow className="mb-2">{t.name}</Eyebrow>
      <h1 className="font-display text-3xl text-deep-blue sm:text-4xl">{t.review.title}</h1>
      <p className="mb-8 mt-2 text-sm text-charcoal/70">{t.review.lead}</p>
      <PhotoFrame image={image} alt={t.review.imageAlt} />
      <div className="mt-8 hidden justify-center gap-3 md:flex">
        <Button type="button" variant="secondary" onClick={onRetake}>
          <FiRefreshCw aria-hidden="true" size={16} />
          {t.review.retake}
        </Button>
        <Button type="button" onClick={onAnalyze}>
          <FiZap aria-hidden="true" size={16} />
          {t.review.analyze}
        </Button>
      </div>
      <div className={cn(BOTTOM_BAR, "md:hidden")}>
        <div className="mx-auto flex max-w-md gap-2">
          <button
            type="button"
            onClick={onRetake}
            className={cn(BAR_BUTTON, BAR_SECONDARY, "flex-1")}
          >
            <FiRefreshCw aria-hidden="true" size={16} />
            {t.review.retake}
          </button>
          <button
            type="button"
            onClick={onAnalyze}
            className={cn(BAR_BUTTON, BAR_PRIMARY, "flex-[1.4]")}
          >
            <FiZap aria-hidden="true" size={16} />
            {t.review.analyze}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AnalyzingScreen({ image, onCancel }: { image: FlowImage; onCancel: () => void }) {
  const [index, setIndex] = useState(0);
  const messages = t.analyzing.messages;

  useEffect(() => {
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % messages.length),
      MESSAGE_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [messages.length]);

  return (
    <div className="mx-auto max-w-xl text-center" aria-busy="true">
      <Eyebrow className="mb-2">{t.name}</Eyebrow>
      <h1 className="font-display text-3xl text-deep-blue sm:text-4xl">{t.analyzing.title}</h1>
      <p role="status" aria-live="polite" className="mb-8 mt-2 min-h-6 text-sm text-emerald-ink">
        {messages[index]}
      </p>
      <PhotoFrame image={image} alt={t.review.imageAlt}>
        <span aria-hidden="true" className="absolute inset-0 bg-emerald-brand/10" />
        {/* Under reduced motion the sweep stops: the status line still says what happens. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-0.5 animate-scan-sweep bg-emerald-brand shadow-neon-emerald"
        />
      </PhotoFrame>
      <div aria-hidden="true" className="mx-auto mt-8 grid max-w-md gap-3">
        <span className="h-16 animate-pulse rounded-2xl bg-mint-mist" />
        <span className="h-4 w-2/3 animate-pulse rounded-full bg-mint-mist" />
        <span className="h-4 w-1/2 animate-pulse rounded-full bg-mint-mist" />
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="mt-6 min-h-11 px-4 text-sm font-semibold text-deep-blue underline underline-offset-4"
      >
        {t.analyzing.cancel}
      </button>
    </div>
  );
}
