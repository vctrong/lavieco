"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";

import { Button, CheckboxField, FormAlert } from "@lavieco/ui";

import { reissueTicketQr } from "../actions/orders";
import { TEXT } from "../constants/text";
import { failureText } from "../utils/failure-text";
import { callAction } from "@/shared/call-action";

/** "Cấp lại QR" of one ticket, for a QR shared by mistake (confirmed in a dialog). */
export function ReissueQr({ ticketId, code }: { ticketId: string; code: string }) {
  const t = TEXT.vi.detail.reissue;
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    setAlert(null);
    const result = await callAction(() => reissueTicketQr(ticketId, notify));
    setBusy(false);
    if (result.status === "ok") {
      setOpen(false);
      router.refresh();
      return;
    }
    setAlert(result.status === "error" ? failureText(result) : TEXT.vi.errors.invalid);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-[12px] font-medium text-deep-blue hover:bg-mint-mist"
      >
        <FiRefreshCw aria-hidden="true" size={12} />
        {t.button}
      </button>
      {open ? (
        <dialog
          ref={dialog}
          aria-labelledby={`cap-lai-${code}`}
          onCancel={() => setOpen(false)}
          className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl bg-white p-6 shadow-gallery backdrop:bg-charcoal/50"
        >
          <h2 id={`cap-lai-${code}`} className="font-display text-xl text-deep-blue">
            {t.title(code)}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-charcoal/75">{t.body}</p>
          <div className="mt-4">
            <CheckboxField
              label={t.notify}
              checked={notify}
              onChange={(event) => setNotify(event.target.checked)}
            />
          </div>
          <FormAlert message={alert} />
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={confirm}>
              {t.confirm}
            </Button>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
