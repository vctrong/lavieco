"use client";

import { FiAlertCircle, FiCheck, FiClock, FiRotateCcw } from "react-icons/fi";

import { Button } from "../components/button";
import { cn } from "../lib/cn";
import type { DraftOffer, DraftStatus } from "./use-form-draft";

/** Copy for the draft notices; each app keeps it in its constants. */
export type DraftText = {
  typing: string;
  saving: string;
  /** "Đã lưu nháp trên máy này lúc {time}" */
  savedAt: (time: string) => string;
  failed: string;
  held: string;
  /** "Có bản nháp chưa gửi, lưu lúc {time}." */
  offer: (time: string) => string;
  /** Shown with the offer when the record changed on the server after the draft. */
  stale: string;
  restore: string;
  discard: string;
};

const timeOf = (at: number) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(at);

/**
 * "Có bản nháp chưa gửi": restore or discard. Shown above the form until answered;
 * nothing is applied without the click, the server copy may be newer.
 */
export function DraftOfferBanner({
  offer,
  text,
  onRestore,
  onDiscard,
  className,
}: {
  offer: DraftOffer | null;
  text: DraftText;
  onRestore: () => void;
  onDiscard: () => void;
  className?: string;
}) {
  if (!offer) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-emerald-brand/40 bg-mint-mist px-4 py-3 text-[13px] leading-relaxed text-deep-blue sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <FiRotateCcw aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
        <div>
          <p>{text.offer(timeOf(offer.savedAt))}</p>
          {offer.stale ? (
            <p className="mt-1 flex items-start gap-1.5 font-medium text-charcoal">
              <FiAlertCircle aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
              {text.stale}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" size="sm" onClick={onRestore}>
          {text.restore}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onDiscard}>
          {text.discard}
        </Button>
      </div>
    </div>
  );
}

/** One quiet line telling whether the input is safe in this browser. */
export function DraftStatusLine({
  status,
  text,
  className,
}: {
  status: DraftStatus;
  text: DraftText;
  className?: string;
}) {
  const content = (() => {
    switch (status.kind) {
      case "idle":
        return null;
      case "typing":
        return { icon: FiClock, label: text.typing, tone: "quiet" };
      case "saving":
        return { icon: FiClock, label: text.saving, tone: "quiet" };
      case "saved":
        return { icon: FiCheck, label: text.savedAt(timeOf(status.at)), tone: "quiet" };
      case "failed":
        return { icon: FiAlertCircle, label: text.failed, tone: "error" };
      case "held":
        return { icon: FiAlertCircle, label: text.held, tone: "notice" };
    }
  })();
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-5 items-center gap-1.5 text-[12px]",
        content?.tone === "error" && "text-error",
        content?.tone === "notice" && "font-medium text-deep-blue",
        (!content || content.tone === "quiet") && "text-charcoal/65",
        className,
      )}
    >
      {content ? (
        <>
          <content.icon aria-hidden="true" size={13} className="shrink-0" />
          <span>{content.label}</span>
        </>
      ) : null}
    </p>
  );
}
