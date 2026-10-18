import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";

import { cn } from "@lavieco/ui";

/** Always-mounted live region for a form-level message. */
export function FormAlert({
  message,
  tone = "error",
  className,
}: {
  message: string | null;
  tone?: "error" | "success";
  className?: string;
}) {
  const Icon = tone === "error" ? FiAlertCircle : FiCheckCircle;
  return (
    <div role={tone === "error" ? "alert" : "status"} aria-live="polite" className={className}>
      {message ? (
        <p
          className={cn(
            "flex items-start gap-2 rounded-2xl px-4 py-3 text-[13px] leading-relaxed text-deep-blue",
            tone === "error" ? "bg-canary/25" : "bg-mint-mist",
          )}
        >
          <Icon aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          <span>{message}</span>
        </p>
      ) : null}
    </div>
  );
}
