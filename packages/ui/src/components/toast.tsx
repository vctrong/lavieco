"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from "react-icons/fi";

import { cn } from "../lib/cn";

export type ToastTone = "success" | "error" | "info";

export type ToastInput = {
  tone: ToastTone;
  /** Text comes from the caller's `constants/text.ts`; never hard-coded here. */
  message: string;
  /** For example "Hoàn tác" after a removal. Closes the toast when pressed. */
  action?: { label: string; onClick: () => void };
};

type ToastItem = ToastInput & { id: number };

const DURATION_MS: Record<ToastTone, number> = { success: 4_000, info: 5_000, error: 8_000 };
const MAX_VISIBLE = 3;

const TONE = {
  success: { icon: FiCheckCircle, iconClass: "text-emerald-ink" },
  info: { icon: FiInfo, iconClass: "text-deep-blue" },
  error: { icon: FiAlertCircle, iconClass: "text-error" },
} as const;

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

/** `const toast = useToast(); toast({ tone: "success", message: TEXT.saved })`. */
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
}

function ToastCard({
  toast,
  closeLabel,
  onClose,
}: {
  toast: ToastItem;
  closeLabel: string;
  onClose: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(DURATION_MS[toast.tone]);

  // Pauses while hovered or focused, so a reader is never cut off mid-sentence.
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = setTimeout(() => onClose(toast.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [paused, onClose, toast.id]);

  const { icon: Icon, iconClass } = TONE[toast.tone];
  return (
    <li
      role={toast.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-pedestal border border-hairline bg-soft-white p-4 text-sm text-charcoal shadow-lg"
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", iconClass)} />
      <p className="min-w-0 flex-1 leading-relaxed">{toast.message}</p>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onClose(toast.id);
          }}
          className="-my-2 min-h-11 shrink-0 rounded-full px-3 font-semibold text-emerald-ink hover:bg-mint-mist"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={closeLabel}
        onClick={() => onClose(toast.id)}
        className="-m-2 grid size-11 shrink-0 place-items-center rounded-full text-charcoal/70 hover:bg-mint-mist"
      >
        <FiX aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
}

/**
 * Short feedback after an action ("Đã lưu", "Đã xoá · Hoàn tác"). Errors stay longer and
 * are announced at once (`role="alert"`); the rest politely. Sits above the admin's
 * bottom tab bar on phones. No motion beyond what `prefers-reduced-motion` allows.
 */
export function ToastProvider({
  labels,
  children,
}: {
  /** Accessible names, from the app's constants: `{ region: "Thông báo", close: "Đóng thông báo" }`. */
  labels: { region: string; close: string };
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const close = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((toast: ToastInput) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { ...toast, id }].slice(-MAX_VISIBLE));
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ol
        aria-label={labels.region}
        className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 mx-auto flex max-w-sm flex-col gap-2 md:inset-x-auto md:right-6 md:bottom-6"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} closeLabel={labels.close} onClose={close} />
        ))}
      </ol>
    </ToastContext.Provider>
  );
}
