"use client";

import type { ReactNode } from "react";
import { FiAlertCircle, FiCheckCircle, FiLoader } from "react-icons/fi";

import { cn } from "../lib/cn";
import type { FieldTone } from "./form-fields";

/** Error colour per surface: `error` on light cards, `error-on-dark` on Deep Sea. */
const ERROR_TEXT: Record<FieldTone, string> = {
  light: "text-error",
  dark: "text-error-on-dark",
};

/** "Các mục có dấu * là bắt buộc." at the top of a form, the `*` in the error colour. */
export function RequiredNote({ text, tone = "light" }: { text: string; tone?: FieldTone }) {
  return (
    <p className={cn("text-[13px]", tone === "light" ? "text-charcoal/70" : "text-mint-mist/75")}>
      <span aria-hidden="true" className={ERROR_TEXT[tone]}>
        *{" "}
      </span>
      {text}
    </p>
  );
}

/**
 * One line just above the submit button ("Còn N mục cần điền hoặc sửa"), for whoever is
 * at the bottom of a long form; plain error-coloured text. Screen readers get
 * `announcement` from a separate hidden live region instead, so it is read once.
 */
export function FormErrorNote({
  message,
  announcement,
  tone = "light",
}: {
  message: string | null;
  /** E.g. "Còn 2 mục cần điền", read out whenever it changes. */
  announcement: string | null;
  tone?: FieldTone;
}) {
  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
      {message ? (
        <p
          aria-hidden="true"
          className={cn("flex items-start gap-2 text-[13px]", ERROR_TEXT[tone])}
        >
          <FiAlertCircle size={15} className="mt-0.5 shrink-0" />
          {message}
        </p>
      ) : null}
    </>
  );
}

type FormAlertProps = {
  tone?: "error" | "success";
  message: string | null;
  /** Surface the alert sits on. */
  surface?: FieldTone;
  className?: string;
  /** Extra content under the message, e.g. a reload button. */
  children?: ReactNode;
};

/** Outcome of a submit. Always mounted, so screen readers announce each new message. */
export function FormAlert({
  tone = "error",
  message,
  surface = "light",
  className,
  children,
}: FormAlertProps) {
  const Icon = tone === "error" ? FiAlertCircle : FiCheckCircle;
  return (
    <div role={tone === "error" ? "alert" : "status"} aria-live="polite" className={className}>
      {message ? (
        <div
          className={cn(
            "space-y-2 rounded-2xl px-4 py-3 text-[13px] leading-relaxed",
            tone === "success"
              ? surface === "light"
                ? "bg-mint-mist text-deep-blue"
                : "bg-soft-white/10 text-mint-mist"
              : surface === "light"
                ? "border border-error/30 bg-white text-error"
                : "border border-error-on-dark/50 text-error-on-dark",
          )}
        >
          <p className="flex items-start gap-2">
            <Icon
              aria-hidden="true"
              size={16}
              className={cn("mt-0.5 shrink-0", tone === "success" && "text-emerald-brand")}
            />
            <span>{message}</span>
          </p>
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Label of a submit button: a spinner (still under reduced motion) while sending. */
export function BusyLabel({
  busy,
  idle,
  sending,
}: {
  busy: boolean;
  idle: string;
  sending: string;
}) {
  if (!busy) return <>{idle}</>;
  return (
    <>
      <FiLoader aria-hidden="true" size={16} className="animate-spin motion-reduce:animate-none" />
      {sending}
    </>
  );
}
