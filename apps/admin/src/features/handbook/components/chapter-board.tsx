"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId, useRef, useState, type ReactNode } from "react";
import {
  FiAlertTriangle,
  FiMove,
  FiMoreVertical,
  FiPlus,
  FiRefreshCw,
  FiTarget,
  FiTrash2,
  FiType,
} from "react-icons/fi";

import { HANDBOOK_CHAPTER_TINTS, type HandbookPage } from "@lavieco/shared/content";
import { cn } from "@lavieco/ui";

import { MediaImage } from "@/shared/components/media-image";

import { TEXT } from "../constants/text";
import { TINT_DOT } from "../constants/tints";
import { canRemoveChapter, type ChapterDraft, type StructureState } from "../utils/structure";
import type { InspectorFocus } from "./page-inspector";

const b = TEXT.vi.board;

function useBoardSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

type PageActions = {
  onSelect: (pageId: string, focus: InspectorFocus) => void;
  onReplace: (pageId: string, file: File) => void;
  onMove: (pageId: string, chapterId: string) => void;
  onRemove: (pageId: string) => void;
};

function PageMenu({
  page,
  number,
  chapters,
  chapterId,
  actions,
}: {
  page: HandbookPage;
  number: number;
  chapters: ChapterDraft[];
  chapterId: string;
  actions: PageActions;
}) {
  const file = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const close = () => menu.current?.removeAttribute("open");
  const item =
    "flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-[13.5px] text-deep-blue hover:bg-mint-mist";
  return (
    <details ref={menu} className="relative">
      <summary
        aria-label={b.pageMenu(number)}
        className="grid size-11 cursor-pointer list-none place-items-center rounded-full bg-soft-white/95 text-deep-blue shadow hover:bg-white [&::-webkit-details-marker]:hidden"
      >
        <FiMoreVertical aria-hidden="true" size={18} />
      </summary>
      <div className="absolute right-0 top-12 z-20 w-56 rounded-2xl border border-hairline bg-white p-1.5 shadow-lg">
        <button type="button" className={item} onClick={() => file.current?.click()}>
          <FiRefreshCw aria-hidden="true" size={15} />
          {b.menu.replace}
        </button>
        <input
          ref={file}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            event.target.value = "";
            close();
            if (picked) actions.onReplace(page.id, picked);
          }}
        />
        <button
          type="button"
          className={item}
          onClick={() => (close(), actions.onSelect(page.id, "text"))}
        >
          <FiType aria-hidden="true" size={15} />
          {b.menu.editText}
        </button>
        <button
          type="button"
          className={item}
          onClick={() => (close(), actions.onSelect(page.id, "hotspot"))}
        >
          <FiTarget aria-hidden="true" size={15} />
          {b.menu.hotspot}
        </button>
        {chapters.length > 1 ? (
          <label className="block px-3 py-2 text-[12px] font-semibold text-deep-blue/70">
            {b.menu.moveTo}
            <select
              value={chapterId}
              onChange={(event) => (close(), actions.onMove(page.id, event.target.value))}
              className="mt-1 block min-h-11 w-full rounded-xl border border-hairline bg-white px-2 text-base text-deep-blue md:text-[13.5px]"
            >
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          className={cn(item, "text-error hover:bg-error/10")}
          onClick={() => {
            close();
            if (window.confirm(b.deleteConfirm(number))) actions.onRemove(page.id);
          }}
        >
          <FiTrash2 aria-hidden="true" size={15} />
          {b.menu.delete}
        </button>
      </div>
    </details>
  );
}

function PageThumb({
  page,
  number,
  selected,
  canWrite,
  chapters,
  chapterId,
  actions,
}: {
  page: HandbookPage;
  number: number;
  selected: boolean;
  canWrite: boolean;
  chapters: ChapterDraft[];
  chapterId: string;
  actions: PageActions;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
    disabled: !canWrite,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 motion-safe:scale-[1.03]")}
    >
      <button
        type="button"
        onClick={() => actions.onSelect(page.id, null)}
        aria-current={selected ? "true" : undefined}
        aria-label={b.pageLabel(number, page.title)}
        className={cn(
          "block w-full overflow-hidden rounded-2xl border-2 bg-paper text-left shadow-sm",
          selected ? "border-emerald-brand" : "border-transparent hover:border-hairline",
        )}
      >
        <span className="relative block aspect-[1/1.414] w-full">
          <MediaImage
            publicId={page.image.publicId}
            alt=""
            fill
            sizes="(min-width: 1024px) 140px, 30vw"
            className="object-cover"
          />
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1.5 text-[12px] text-deep-blue">
          <span className="rounded-full bg-deep-blue px-1.5 text-[11px] font-semibold text-soft-white">
            {String(number).padStart(2, "0")}
          </span>
          <span className="truncate">{page.title}</span>
        </span>
      </button>
      <div className="pointer-events-none absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
        {page.missingText ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-canary px-2 py-0.5 text-[11px] font-semibold text-charcoal">
            <FiAlertTriangle aria-hidden="true" size={11} />
            {b.missingText}
          </span>
        ) : null}
        {page.aspectOff ? (
          <span className="rounded-full bg-soft-white px-2 py-0.5 text-[11px] font-semibold text-charcoal">
            {b.aspectOff}
          </span>
        ) : null}
        {page.hotspots.length > 0 ? (
          <span className="rounded-full bg-mint-mist px-2 py-0.5 text-[11px] font-semibold text-emerald-ink">
            {b.hotspots(page.hotspots.length)}
          </span>
        ) : null}
      </div>
      {canWrite ? (
        <div className="absolute right-1.5 top-1.5 flex flex-col gap-1">
          <PageMenu
            page={page}
            number={number}
            chapters={chapters}
            chapterId={chapterId}
            actions={actions}
          />
          <button
            type="button"
            aria-label={b.dragPage}
            {...attributes}
            {...listeners}
            className="grid size-11 cursor-grab touch-none place-items-center rounded-full bg-soft-white/95 text-deep-blue shadow active:cursor-grabbing"
          >
            <FiMove aria-hidden="true" size={16} />
          </button>
        </div>
      ) : null}
    </li>
  );
}

function ChapterCard({
  chapter,
  pageCount,
  canWrite,
  removable,
  onRename,
  onTint,
  onRemove,
  children,
}: {
  chapter: ChapterDraft;
  pageCount: number;
  canWrite: boolean;
  removable: boolean;
  onRename: (title: string) => void;
  onTint: (tint: ChapterDraft["tint"]) => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: chapter.id,
    disabled: !canWrite,
  });
  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="rounded-3xl border border-hairline bg-white p-4 md:p-5"
    >
      <header className="mb-4 flex flex-wrap items-center gap-2">
        {canWrite ? (
          <button
            type="button"
            aria-label={b.dragChapter}
            {...attributes}
            {...listeners}
            className="grid size-11 cursor-grab touch-none place-items-center rounded-full text-deep-blue/70 hover:bg-mint-mist active:cursor-grabbing"
          >
            <FiMove aria-hidden="true" size={16} />
          </button>
        ) : null}
        <span aria-hidden="true" className={cn("size-3 rounded-full", TINT_DOT[chapter.tint])} />
        <label className="min-w-0 flex-1">
          <span className="sr-only">{b.chapterTitle}</span>
          <input
            value={chapter.title}
            disabled={!canWrite}
            maxLength={120}
            onChange={(event) => onRename(event.target.value)}
            className="w-full rounded-xl border border-transparent bg-transparent px-2 py-1 font-display text-xl text-deep-blue hover:border-hairline focus:border-emerald-brand focus:outline-none md:text-2xl"
          />
        </label>
        <span className="rounded-full bg-mint-mist px-2.5 py-1 text-[12px] font-semibold text-deep-blue">
          {b.pages(pageCount)}
        </span>
        {canWrite ? (
          <>
            <label className="text-[12px] text-deep-blue/70">
              <span className="sr-only">{b.tint}</span>
              <select
                value={chapter.tint}
                onChange={(event) => onTint(event.target.value as ChapterDraft["tint"])}
                className="min-h-11 rounded-full border border-hairline bg-white px-3 text-base text-deep-blue md:text-[13px]"
              >
                {HANDBOOK_CHAPTER_TINTS.map((tint) => (
                  <option key={tint} value={tint}>
                    {TEXT.vi.tints[tint]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={onRemove}
              disabled={!removable}
              title={removable ? b.deleteChapter : b.deleteChapterBlocked}
              aria-label={b.deleteChapter}
              className="grid size-11 place-items-center rounded-full text-error hover:bg-error/10 disabled:text-charcoal/30 disabled:hover:bg-transparent"
            >
              <FiTrash2 aria-hidden="true" size={16} />
            </button>
          </>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/**
 * Pages grouped by chapter (06-admin layout): drag a page to reorder it inside its
 * chapter, drag a chapter by its handle to reorder chapters; "Chuyển sang chương" moves
 * a page across. Keyboard dragging works too (space, arrows, space).
 */
export function ChapterBoard({
  structure,
  pagesById,
  numbers,
  selectedPageId,
  canWrite,
  onReorderChapters,
  onReorderPages,
  onRenameChapter,
  onTintChapter,
  onRemoveChapter,
  onAddChapter,
  actions,
}: {
  structure: StructureState;
  pagesById: Map<string, HandbookPage>;
  numbers: Map<string, number>;
  selectedPageId: string | null;
  canWrite: boolean;
  onReorderChapters: (from: number, to: number) => void;
  onReorderPages: (chapterId: string, from: number, to: number) => void;
  onRenameChapter: (chapterId: string, title: string) => void;
  onTintChapter: (chapterId: string, tint: ChapterDraft["tint"]) => void;
  onRemoveChapter: (chapterId: string) => void;
  onAddChapter: () => void;
  actions: PageActions;
}) {
  const sensors = useBoardSensors();
  // dnd-kit numbers its screen-reader ids with a global counter, which differs between
  // the server render and the browser: stable ids keep hydration consistent.
  const dndId = useId();
  const [filter, setFilter] = useState<string | null>(null);
  const total = numbers.size;

  const chapterDragEnd = (event: DragEndEvent) => {
    const from = structure.chapters.findIndex((chapter) => chapter.id === event.active.id);
    const to = structure.chapters.findIndex((chapter) => chapter.id === event.over?.id);
    if (from >= 0 && to >= 0 && from !== to) onReorderChapters(from, to);
  };

  const visible = structure.chapters.filter((chapter) => !filter || chapter.id === filter);
  const chip = (active: boolean) =>
    cn(
      "flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[13px]",
      active
        ? "bg-emerald-brand font-semibold text-charcoal"
        : "border border-hairline bg-white text-deep-blue",
    );

  return (
    <div className="space-y-4">
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex min-w-max gap-2">
          <button type="button" className={chip(filter === null)} onClick={() => setFilter(null)}>
            {b.all(total)}
          </button>
          {structure.chapters.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              className={chip(filter === chapter.id)}
              onClick={() => setFilter(chapter.id)}
            >
              <span
                aria-hidden="true"
                className={cn("size-2.5 rounded-full", TINT_DOT[chapter.tint])}
              />
              {chapter.title}
            </button>
          ))}
        </div>
      </div>

      <DndContext
        id={`${dndId}-chapters`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={chapterDragEnd}
      >
        <SortableContext
          items={visible.map((chapter) => chapter.id)}
          strategy={verticalListSortingStrategy}
        >
          {visible.map((chapter) => {
            const pageIds = structure.pagesByChapter[chapter.id] ?? [];
            return (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                pageCount={pageIds.length}
                canWrite={canWrite}
                removable={canRemoveChapter(structure, chapter.id)}
                onRename={(title) => onRenameChapter(chapter.id, title)}
                onTint={(tint) => onTintChapter(chapter.id, tint)}
                onRemove={() => onRemoveChapter(chapter.id)}
              >
                {pageIds.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-hairline p-4 text-[13.5px] text-charcoal/65">
                    {b.empty}
                  </p>
                ) : (
                  <DndContext
                    id={`${dndId}-${chapter.id}`}
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => {
                      const from = pageIds.indexOf(String(event.active.id));
                      const to = pageIds.indexOf(String(event.over?.id));
                      if (from >= 0 && to >= 0 && from !== to) onReorderPages(chapter.id, from, to);
                    }}
                  >
                    <SortableContext items={pageIds} strategy={rectSortingStrategy}>
                      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {pageIds.map((id) => {
                          const page = pagesById.get(id);
                          if (!page) return null;
                          return (
                            <PageThumb
                              key={id}
                              page={page}
                              number={numbers.get(id) ?? 0}
                              selected={id === selectedPageId}
                              canWrite={canWrite}
                              chapters={structure.chapters}
                              chapterId={chapter.id}
                              actions={actions}
                            />
                          );
                        })}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}
              </ChapterCard>
            );
          })}
        </SortableContext>
      </DndContext>

      {canWrite ? (
        <button
          type="button"
          onClick={onAddChapter}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-hairline bg-white text-[14px] font-semibold text-deep-blue hover:bg-mint-mist"
        >
          <FiPlus aria-hidden="true" size={16} />
          {b.addChapter}
        </button>
      ) : null}
    </div>
  );
}
