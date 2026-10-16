import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";

import { cn } from "@lavieco/ui";

type FormAlertProps = { tone: "error" | "success"; message: string | null; className?: string };

/** Always mounted live region so screen readers announce each new message. */
export function FormAlert({ tone, message, className }: FormAlertProps) {
  const Icon = tone === "error" ? FiAlertCircle : FiCheckCircle;
  return (
    <div role={tone === "error" ? "alert" : "status"} aria-live="polite" className={className}>
      {message ? (
        <p
          className={cn(
            "flex items-start gap-2 rounded-2xl px-4 py-3 text-[13px] leading-relaxed",
            tone === "error" ? "bg-canary/25 text-deep-blue" : "bg-mint-mist text-deep-blue",
          )}
        >
          <Icon
            aria-hidden="true"
            size={16}
            className={cn("mt-0.5 shrink-0", tone === "success" && "text-emerald-brand")}
          />
          <span>{message}</span>
        </p>
      ) : null}
    </div>
  );
}
