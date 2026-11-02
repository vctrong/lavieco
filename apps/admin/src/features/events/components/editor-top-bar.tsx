"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiEye } from "react-icons/fi";

import type { EventView } from "@lavieco/shared/events";
import { Button, FormAlert } from "@lavieco/ui";

import { changeEventStatus } from "../actions/events";
import { previewPath } from "../constants/preview";
import { TEXT } from "../constants/text";
import { EDITOR_BLOCKS, type EditorBlock } from "../hooks/use-editor-blocks";
import { failureText } from "../utils/failure-text";
import { StatusBadge } from "./status-badge";
import { callAction } from "@/shared/call-action";

type EditorTopBarProps = {
  event: EventView;
  canWrite: boolean;
  dirtyBlocks: ReadonlySet<EditorBlock>;
  saveDirty: () => Promise<boolean>;
};

/**
 * Stays on top of the editor: title, status, what is unsaved, preview and publish.
 * No "send for review" here: events publish without a second reviewer (BR-17).
 */
export function EditorTopBar({ event, canWrite, dirtyBlocks, saveDirty }: EditorTopBarProps) {
  const t = TEXT.vi.editorBar;
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dirty = dirtyBlocks.size > 0;
  const href = previewPath(event.id);

  useEffect(() => {
    if (asking) dialog.current?.showModal();
  }, [asking]);

  const openPreview = () => {
    setAsking(false);
    window.open(href, "_blank", "noopener");
  };

  const saveThenOpen = async () => {
    // Opened now, while the click still counts as a user gesture; pop-up blockers
    // would refuse a tab opened after the save. Hence no "noopener" feature here.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setBusy(true);
    const saved = await saveDirty();
    setBusy(false);
    setAsking(false);
    if (!saved) {
      tab?.close();
      setAlert(t.saveFailed);
      return;
    }
    if (tab) tab.location.href = href;
  };

  const publish = async () => {
    setBusy(true);
    setAlert(null);
    const result = await callAction(() =>
      changeEventStatus(event.id, { action: "publish", revision: event.revision }),
    );
    setBusy(false);
    setConfirmPublish(false);
    if (result.status === "ok") {
      router.refresh();
      return;
    }
    setAlert(result.status === "error" ? failureText(result) : TEXT.vi.errors.invalid);
  };

  const canPublish =
    canWrite && event.status === "draft" && event.readiness.blockers.length === 0 && !dirty;

  return (
    <div className="sticky top-0 z-30 -mx-1 mb-6 rounded-2xl border border-hairline bg-white/95 px-4 py-3 shadow-ambient backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <h1 className="truncate font-display text-xl text-deep-blue">{event.title}</h1>
          <StatusBadge status={event.status} className="shrink-0" />
        </div>
        <p
          role="status"
          className="flex items-center gap-1.5 text-[12.5px] font-medium text-deep-blue/80"
        >
          {dirty ? (
            <FiAlertCircle aria-hidden="true" size={14} />
          ) : (
            <FiCheckCircle aria-hidden="true" size={14} className="text-emerald-ink" />
          )}
          {dirty
            ? t.unsaved(
                EDITOR_BLOCKS.filter((block) => dirtyBlocks.has(block)).map(
                  (block) => t.blocks[block],
                ),
              )
            : t.saved}
        </p>
        {dirty ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setAsking(true)}>
            <FiEye aria-hidden="true" size={13} />
            {t.preview}
          </Button>
        ) : (
          <Button as="a" href={href} target="_blank" rel="noopener" variant="secondary" size="sm">
            <FiEye aria-hidden="true" size={13} />
            {t.preview}
          </Button>
        )}
        {canWrite && event.status === "draft" ? (
          confirmPublish ? (
            <span className="flex items-center gap-2">
              <span className="text-[12.5px] text-deep-blue">{t.publishConfirm}</span>
              <Button type="button" size="sm" disabled={busy} onClick={publish}>
                {t.yes}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmPublish(false)}
              >
                {t.no}
              </Button>
            </span>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={!canPublish}
              onClick={() => setConfirmPublish(true)}
              className="disabled:cursor-not-allowed disabled:opacity-50"
            >
              {event.kind === "past" ? t.publishPast : t.publish}
            </Button>
          )
        ) : null}
      </div>
      {alert ? (
        <div className="mt-2">
          <FormAlert message={alert} />
        </div>
      ) : null}
      {asking ? (
        <dialog
          ref={dialog}
          aria-labelledby="xem-truoc-chua-luu"
          onCancel={() => setAsking(false)}
          className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl bg-white p-6 shadow-gallery backdrop:bg-charcoal/50"
        >
          <h2 id="xem-truoc-chua-luu" className="font-display text-xl text-deep-blue">
            {t.askTitle}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-charcoal/75">{t.askBody}</p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="link"
              size="sm"
              disabled={busy}
              onClick={() => setAsking(false)}
            >
              {t.cancel}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={openPreview}
            >
              {t.viewSaved}
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={saveThenOpen}>
              {busy ? t.saving : t.saveThenView}
            </Button>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
