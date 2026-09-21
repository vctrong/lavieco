"use client";

import { useEffect } from "react";
import { FiRefreshCw } from "react-icons/fi";

import { Button } from "@lavieco/ui";

import { TideWaves, UtilityPageShell, UtilityTitle } from "@/shared/components/utility-page";

import { TEXT } from "../constants/text";

type ServerErrorViewProps = {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the failed segment (Next 16.3 `retry`). */
  retry: () => void;
};

/**
 * 500: rough sea, warm tone. Shared by `error.tsx` and `global-error.tsx`.
 * Never shows `error.message` or the stack; only the opaque `digest`, so a visitor
 * can quote it to support and the team can match it to server logs.
 */
export function ServerErrorView({ error, retry }: ServerErrorViewProps) {
  const t = TEXT.vi;

  useEffect(() => {
    // TODO(observability): forward to the monitoring tool once one is chosen.
    // `reportError` logs to the console and raises `window.onerror`, so a tool that hooks
    // global errors will pick it up without changing this call site.
    if (typeof globalThis.reportError === "function") globalThis.reportError(error);
  }, [error]);

  return (
    <UtilityPageShell
      backdrop={{ kind: "numeral", value: "500" }}
      badge={t.badge}
      footerNote={
        error.digest ? (
          <p className="text-[11px] tracking-wide text-deep-blue/70">
            {t.referenceLabel}:{" "}
            <span className="font-medium tabular-nums select-all">{error.digest}</span>
          </p>
        ) : null
      }
    >
      <div className="relative -my-2 flex h-52 w-full max-w-md items-center justify-center md:h-64">
        <div
          aria-hidden="true"
          className="absolute size-52 rounded-full bg-deep-blue/10 blur-3xl"
        />
        <TideWaves variant="rough" />
      </div>
      <div className="mt-2 max-w-xl space-y-4">
        <UtilityTitle lead={t.title.lead} emphasis={t.title.emphasis} accent />
        <p className="text-lg leading-relaxed font-light text-balance text-charcoal/80">
          {t.subtitle}
        </p>
      </div>
      <div className="mt-10 flex w-full max-w-xs flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
        <Button type="button" onClick={retry} className="px-8 py-3.5">
          <FiRefreshCw
            aria-hidden="true"
            size={16}
            className="transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none"
          />
          <span>{t.retryLabel}</span>
        </Button>
        {/* A plain anchor on purpose: after a crash a full document load is the safest way home. */}
        <Button as="a" href="/" variant="secondary" className="px-8 py-3.5">
          {t.homeLabel}
        </Button>
      </div>
    </UtilityPageShell>
  );
}
