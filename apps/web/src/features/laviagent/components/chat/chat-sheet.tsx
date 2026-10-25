"use client";

import { useEffect, useRef, useState, type ComponentProps, type PointerEvent } from "react";
import { FiMaximize2, FiMinimize2, FiX } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { TEXT } from "../../constants/text";
import { ChatPanel } from "./chat-panel";

const t = TEXT.vi.chat;
const DRAG_THRESHOLD_PX = 60;

type ChatSheetProps = Omit<ComponentProps<typeof ChatPanel>, "actions" | "className"> & {
  open: boolean;
  onClose: () => void;
};

/**
 * The chat as a bottom sheet on phones (drag up to expand, down to close) and a side
 * panel on desktop. A modal <dialog> gives the focus trap, Esc and an inert page. The
 * dialog follows the visual viewport, so the on-screen keyboard never hides the input.
 */
export function ChatSheet({ open, onClose, ...panel }: ChatSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Never leave the page locked if the sheet unmounts while open.
  useEffect(() => () => void (document.documentElement.style.overflow = ""), []);

  useEffect(() => {
    const viewport = window.visualViewport;
    const dialog = dialogRef.current;
    if (!open || !viewport || !dialog) return;
    const sync = () => {
      dialog.style.setProperty("--vvh", `${viewport.height}px`);
      dialog.style.setProperty("--vvt", `${viewport.offsetTop}px`);
    };
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, [open]);

  const handleClosed = () => {
    document.documentElement.style.overflow = "";
    setExpanded(false);
    onClose();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    const delta = event.clientY - dragStart.current;
    dragStart.current = null;
    if (delta < -DRAG_THRESHOLD_PX) setExpanded(true);
    else if (delta > DRAG_THRESHOLD_PX) {
      if (expanded) setExpanded(false);
      else dialogRef.current?.close();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={t.title}
      onClose={handleClosed}
      onClick={(event) => {
        // A click on the backdrop (the dialog box itself, outside the sheet) closes it.
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      className="fixed inset-x-0 top-[var(--vvt,0px)] m-0 h-[var(--vvh,100dvh)] max-h-none w-full max-w-none bg-transparent p-0 backdrop:modal-scrim open:flex open:flex-col open:justify-end lg:open:flex-row lg:open:justify-end"
    >
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-soft-white shadow-phone transition-[height] duration-300 ease-gallery lg:h-full lg:max-w-[440px] lg:rounded-none lg:rounded-l-[1.75rem]",
          expanded ? "h-full rounded-t-none" : "h-[min(82dvh,var(--vvh,100dvh))]",
        )}
      >
        <div
          role="presentation"
          title={t.dragHandle}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (dragStart.current = null)}
          className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center lg:hidden"
        >
          <span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-deep-blue/20" />
        </div>
        <ChatPanel
          {...panel}
          className="min-h-0 flex-1"
          actions={
            <>
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-label={expanded ? t.collapse : t.expand}
                aria-pressed={expanded}
                className="flex size-11 items-center justify-center rounded-full text-deep-blue hover:bg-mint-mist lg:hidden"
              >
                {expanded ? (
                  <FiMinimize2 aria-hidden="true" size={17} />
                ) : (
                  <FiMaximize2 aria-hidden="true" size={17} />
                )}
              </button>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label={t.close}
                className="flex size-11 items-center justify-center rounded-full bg-mint-mist text-deep-blue hover:bg-emerald-brand hover:text-charcoal"
              >
                <FiX aria-hidden="true" size={18} />
              </button>
            </>
          }
        />
      </div>
    </dialog>
  );
}
