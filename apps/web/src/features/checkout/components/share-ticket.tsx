"use client";

import { useState } from "react";
import { FiLink, FiMessageCircle, FiShare2 } from "react-icons/fi";

import { TEXT } from "../constants/text";
import { ZALO_WEB_URL } from "../constants/config";

const t = TEXT.vi.ticket.share;

const ACTION =
  "inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-deep-blue hover:bg-mint-mist";

/**
 * Share one ticket with whoever comes along: the system sheet where there is one, the
 * link otherwise. Zalo has no public "share this URL" link for a website without an
 * Official Account, so its button copies the link and opens Zalo to paste it.
 */
export function ShareTicket({ url, title }: { url: string; title: string }) {
  const [note, setNote] = useState<string | null>(null);

  const copy = async (done: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setNote(done);
      return true;
    } catch {
      setNote(t.failed);
      return false;
    }
  };
  const native = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      // Closing the share sheet is not an error worth showing.
    }
  };
  const zalo = () => {
    // Opened before the await: pop-up blockers refuse a tab opened later.
    window.open(ZALO_WEB_URL, "_blank", "noopener");
    void copy(t.zaloCopied);
  };

  return (
    <div className="mt-5 border-t border-hairline pt-4 print:hidden">
      <p className="text-[12.5px] font-semibold text-deep-blue">{t.title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-charcoal/65">{t.hint}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {typeof navigator !== "undefined" && "share" in navigator ? (
          <button type="button" onClick={native} className={ACTION}>
            <FiShare2 aria-hidden="true" size={13} />
            {t.native}
          </button>
        ) : null}
        <button type="button" onClick={() => void copy(t.copied)} className={ACTION}>
          <FiLink aria-hidden="true" size={13} />
          {t.copy}
        </button>
        <button type="button" onClick={zalo} className={ACTION}>
          <FiMessageCircle aria-hidden="true" size={13} />
          {t.zalo}
        </button>
      </div>
      <p aria-live="polite" className="mt-1.5 min-h-4 text-[12px] text-emerald-ink">
        {note}
      </p>
    </div>
  );
}
