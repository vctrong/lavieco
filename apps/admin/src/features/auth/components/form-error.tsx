import { FiAlertCircle } from "react-icons/fi";

/** Always-mounted live region for the form-level error. */
export function FormError({ message }: { message: string | null }) {
  return (
    <div role="alert" aria-live="polite">
      {message ? (
        <p className="flex items-start gap-2 rounded-2xl bg-canary/25 px-4 py-3 text-[13px] leading-relaxed text-deep-blue">
          <FiAlertCircle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          <span>{message}</span>
        </p>
      ) : null}
    </div>
  );
}
