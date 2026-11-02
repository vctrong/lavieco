"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import type { EventType, EventView } from "@lavieco/shared/events";
import { Button } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import { useEditorBlocks } from "../hooks/use-editor-blocks";
import { useLeaveGuard } from "../hooks/use-leave-guard";
import { DetailsForm } from "./details-form";
import { EditorSideNav } from "./editor-side-nav";
import { EditorTopBar } from "./editor-top-bar";
import { FormBuilder } from "./form-builder";
import { StatusPanel } from "./status-panel";
import { TicketTypesSection } from "./ticket-types-section";

function LeaveDialog({ href, onStay }: { href: string; onStay: () => void }) {
  const t = TEXT.vi.editorBar;
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => dialog.current?.showModal(), []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="roi-trang"
      onCancel={onStay}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl bg-white p-6 shadow-gallery backdrop:bg-charcoal/50"
    >
      <h2 id="roi-trang" className="font-display text-xl text-deep-blue">
        {t.leaveTitle}
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-charcoal/75">{t.leaveBody}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => router.push(href)}>
          {t.leave}
        </Button>
        <Button type="button" size="sm" onClick={onStay}>
          {t.stay}
        </Button>
      </div>
    </dialog>
  );
}

/**
 * Top bar, anchor menu, the blocks, and the status panel. Each block still saves on its
 * own; the editor only knows which hold unsaved changes. These block status changes.
 */
export function EventEditor({
  event,
  types,
  canWrite,
  canApprove,
  vouchersSection,
}: {
  event: EventView;
  types: EventType[];
  canWrite: boolean;
  canApprove: boolean;
  /** "Mã giảm giá", composed by the route: features do not import each other (F2). */
  vouchersSection?: ReactNode;
}) {
  const { dirtyBlocks, setDirty, register, saveDirty } = useEditorBlocks(event);
  const { leavingTo, stay } = useLeaveGuard(dirtyBlocks.size > 0);
  const blockProps = { onDirtyChange: setDirty, registerSaver: register };
  return (
    <>
      <EditorTopBar
        event={event}
        canWrite={canWrite}
        dirtyBlocks={dirtyBlocks}
        saveDirty={saveDirty}
      />
      <div className="grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)] xl:grid-cols-[11rem_minmax(0,1fr)_20rem]">
        <EditorSideNav event={event} withVouchers={Boolean(vouchersSection)} />
        <div className="min-w-0 space-y-6">
          {/* Forms keep their own state; submits read the latest `revision` from props. */}
          <DetailsForm event={event} types={types} canWrite={canWrite} {...blockProps} />
          <TicketTypesSection event={event} canWrite={canWrite} {...blockProps} />
          <FormBuilder event={event} canWrite={canWrite} {...blockProps} />
          {vouchersSection}
        </div>
        <div className="lg:col-start-2 xl:sticky xl:top-24 xl:col-start-3 xl:self-start">
          <StatusPanel
            event={event}
            canWrite={canWrite}
            canApprove={canApprove}
            dirty={dirtyBlocks.size > 0}
          />
        </div>
      </div>
      {leavingTo ? <LeaveDialog href={leavingTo} onStay={stay} /> : null}
    </>
  );
}
