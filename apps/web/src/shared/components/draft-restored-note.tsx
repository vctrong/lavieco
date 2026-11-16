"use client";

import { FiRotateCcw } from "react-icons/fi";

import { cn, type FieldTone } from "@lavieco/ui";

import { FORM_TEXT } from "../constants/form-text";

/** "Đã điền lại thông tin bạn nhập trước đó", with a way to start over. */
export function DraftRestoredNote({
  shown,
  onForget,
  tone = "light",
}: {
  shown: boolean;
  onForget: () => void;
  tone?: FieldTone;
}) {
  const t = FORM_TEXT.vi.draft;
  if (!shown) return null;
  return (
    <p
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-4 py-2 text-[13px]",
        tone === "light" ? "bg-mint-mist text-deep-blue" : "bg-soft-white/10 text-mint-mist",
      )}
    >
      <FiRotateCcw aria-hidden="true" size={14} className="shrink-0" />
      <span>{t.restored}</span>
      <button
        type="button"
        onClick={onForget}
        className={cn(
          "min-h-11 font-medium underline underline-offset-4",
          tone === "light" ? "text-emerald-ink" : "text-soft-white",
        )}
      >
        {t.clear}
      </button>
    </p>
  );
}
