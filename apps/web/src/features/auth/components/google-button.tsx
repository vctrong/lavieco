import { FiArrowRight } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { NEXT_PARAM, ROUTES } from "../constants/config";
import { TEXT } from "../constants/text";

type GoogleButtonProps = {
  next: string;
  /** Sign-up form: only after the consent box is ticked; the flag travels to the callback. */
  withConsent?: boolean;
  disabled?: boolean;
  onBlocked?: () => void;
};

/**
 * Full-page navigation to the BFF route that starts Google sign-in (members only).
 * No Google script is loaded on our pages; the brand mark is replaced by a plain arrow
 * because only Feather icons are allowed (docs/04 §5.4).
 */
export function GoogleButton({ next, withConsent, disabled, onBlocked }: GoogleButtonProps) {
  const t = TEXT.vi.google;
  const params = new URLSearchParams({
    [NEXT_PARAM]: next,
    ...(withConsent ? { "dong-y": "1" } : {}),
  });
  return (
    <>
      <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-museum text-charcoal/50">
        <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
        {t.or}
        <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
      </div>
      <a
        href={`${ROUTES.googleStart}?${params.toString()}`}
        aria-disabled={disabled ? true : undefined}
        onClick={(event) => {
          if (!disabled) return;
          event.preventDefault();
          onBlocked?.();
        }}
        className={cn(
          "group flex w-full items-center justify-center gap-2 rounded-full border border-deep-blue/20 bg-white px-6 py-3 text-sm font-semibold text-deep-blue transition-colors hover:border-emerald-brand hover:bg-mint-mist",
          disabled && "cursor-not-allowed opacity-60 hover:border-deep-blue/20 hover:bg-white",
        )}
      >
        {t.button}
        <FiArrowRight
          aria-hidden="true"
          size={16}
          className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </a>
    </>
  );
}
