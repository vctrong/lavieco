"use client";

import { FiDownload, FiPlusSquare, FiShare, FiX } from "react-icons/fi";

import { Button } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import { useInstallState } from "../hooks/use-install-state";

/**
 * Phones only: a small card above the tab bar suggesting to install the app (native
 * prompt on Android Chrome, written steps on iOS Safari). Hidden once installed or for
 * two weeks after "Để sau"; desktop browsers offer install in their own address bar.
 */
export function InstallPrompt() {
  const t = TEXT.vi.install;
  const { state, dismiss } = useInstallState();
  if (state.kind === "hidden") return null;

  return (
    <aside
      aria-label={t.label}
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-hairline bg-white p-4 shadow-lg md:hidden"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint-mist text-deep-blue">
          <FiDownload aria-hidden="true" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-deep-blue">{t.title}</p>
          {state.kind === "ios" ? (
            <p className="mt-1 text-[14px] leading-relaxed text-charcoal/80">
              {t.iosBody} <FiShare aria-hidden="true" className="inline align-[-2px]" size={15} />{" "}
              {t.iosThen}{" "}
              <FiPlusSquare aria-hidden="true" className="inline align-[-2px]" size={15} />
            </p>
          ) : (
            <p className="mt-1 text-[14px] leading-relaxed text-charcoal/80">{t.androidBody}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {state.kind === "prompt" ? (
              <Button type="button" className="min-h-11" onClick={() => void state.install()}>
                {t.install}
              </Button>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="min-h-11 rounded-full px-4 text-[14px] font-medium text-deep-blue hover:bg-mint-mist"
            >
              {t.dismiss}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.dismissLabel}
          className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-full text-charcoal/60 hover:bg-mint-mist"
        >
          <FiX aria-hidden="true" size={18} />
        </button>
      </div>
    </aside>
  );
}
