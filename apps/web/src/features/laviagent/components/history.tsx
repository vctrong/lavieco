"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  FiChevronsLeft,
  FiChevronsRight,
  FiHome,
  FiMessageSquare,
  FiPlus,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { MATERIAL_ICONS } from "../constants/icons";
import { TEXT } from "../constants/text";
import type { Catalog } from "../types";
import type { ConversationSummary } from "../utils/chat-history-store";
import { groupByDate } from "../utils/group-by-date";

const t = TEXT.vi.history;

type HistoryListProps = {
  catalog: Catalog;
  conversations: ConversationSummary[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
};

/** Conversations grouped by "Hôm nay / 7 ngày qua / Cũ hơn", newest first. */
export function HistoryList({
  catalog,
  conversations,
  activeId,
  onOpen,
  onRemove,
}: HistoryListProps) {
  if (conversations.length === 0) {
    return <p className="px-3 py-2 text-sm leading-relaxed text-charcoal/60">{t.empty}</p>;
  }
  return (
    <nav aria-label={t.title} className="space-y-5">
      {groupByDate(conversations).map(({ group, items }) => (
        <section key={group}>
          <h3 className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-museum text-charcoal/50">
            {t.groups[group]}
          </h3>
          <ul className="space-y-0.5">
            {items.map((conversation) => {
              const material = catalog.materials.find((item) => item.id === conversation.material);
              const Icon = material ? MATERIAL_ICONS[material.icon] : FiMessageSquare;
              const active = conversation.id === activeId;
              const title = conversation.title || t.untitled;
              return (
                <li key={conversation.id} className="group/item relative">
                  <button
                    type="button"
                    onClick={() => onOpen(conversation.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-2.5 rounded-xl py-2 pl-3 pr-11 text-left text-sm transition-colors",
                      active
                        ? "bg-mint-mist font-semibold text-deep-blue"
                        : "text-charcoal/85 hover:bg-mint-mist/60",
                    )}
                  >
                    <Icon aria-hidden="true" size={15} className="shrink-0 text-emerald-ink" />
                    <span className="min-w-0 flex-1 truncate">{title}</span>
                  </button>
                  {/* Visible on touch screens; on mouse screens it appears on hover / focus. */}
                  <button
                    type="button"
                    onClick={() => onRemove(conversation.id)}
                    aria-label={t.remove(title)}
                    className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-charcoal/50 transition hover:bg-soft-white hover:text-error focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/item:opacity-100"
                  >
                    <FiTrash2 aria-hidden="true" size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

const NEW_CHAT_BUTTON =
  "flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-brand text-sm font-bold text-charcoal shadow-emerald-cta-sm transition-transform hover:scale-[1.02]";

/** Desktop: the left column, collapsible to an icon rail. */
export function HistorySidebar({
  collapsed,
  onToggle,
  onNew,
  ...list
}: HistoryListProps & { collapsed: boolean; onToggle: () => void; onNew: () => void }) {
  return (
    <aside
      aria-label={t.title}
      className={cn(
        "hidden min-h-0 shrink-0 flex-col rounded-[2rem] border border-hairline bg-soft-white transition-[width] duration-300 ease-gallery lg:flex",
        collapsed ? "w-16" : "w-72",
      )}
    >
      <div className={cn("flex items-center gap-2 p-3", collapsed && "flex-col")}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? t.expand : t.collapse}
          aria-expanded={!collapsed}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-deep-blue hover:bg-mint-mist"
        >
          {collapsed ? (
            <FiChevronsRight aria-hidden="true" size={18} />
          ) : (
            <FiChevronsLeft aria-hidden="true" size={18} />
          )}
        </button>
        <button
          type="button"
          onClick={onNew}
          aria-label={collapsed ? t.newChat : undefined}
          className={cn(NEW_CHAT_BUTTON, collapsed ? "size-10" : "flex-1 px-4")}
        >
          <FiPlus aria-hidden="true" size={16} />
          {collapsed ? null : t.newChat}
        </button>
      </div>
      {collapsed ? null : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
            <HistoryList {...list} />
          </div>
          <p className="border-t border-hairline px-5 py-3 text-[11px] text-charcoal/55">
            {t.deviceOnly}
          </p>
        </>
      )}
    </aside>
  );
}

/** Phones and tablets: the same list in a drawer from the left (modal <dialog>). */
export function HistoryDrawer({
  open,
  onClose,
  onNew,
  ...list
}: HistoryListProps & { open: boolean; onClose: () => void; onNew: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={t.title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      className="fixed inset-y-0 left-0 m-0 h-full max-h-none w-[min(20rem,86vw)] max-w-none bg-soft-white p-0 text-charcoal shadow-phone backdrop:modal-scrim open:flex open:flex-col lg:hidden"
    >
      <div className="flex items-center gap-2 border-b border-hairline px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="min-w-0 flex-1 px-2 font-display text-xl text-deep-blue">{t.title}</p>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label={t.close}
          className="flex size-11 items-center justify-center rounded-full bg-mint-mist text-deep-blue"
        >
          <FiX aria-hidden="true" size={18} />
        </button>
      </div>
      <div className="p-3">
        <button
          type="button"
          onClick={() => {
            onNew();
            ref.current?.close();
          }}
          className={cn(NEW_CHAT_BUTTON, "w-full px-4")}
        >
          <FiPlus aria-hidden="true" size={16} />
          {t.newChat}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
        <HistoryList
          {...list}
          onOpen={(id) => {
            list.onOpen(id);
            ref.current?.close();
          }}
        />
      </div>
      <div className="space-y-2 border-t border-hairline px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <p className="text-[11px] text-charcoal/55">{t.deviceOnly}</p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-deep-blue hover:text-emerald-ink"
        >
          <FiHome aria-hidden="true" size={15} />
          {t.home}
        </Link>
      </div>
    </dialog>
  );
}
