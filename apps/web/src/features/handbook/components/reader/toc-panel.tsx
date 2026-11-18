"use client";

import { useEffect, useRef, useState } from "react";
import { FiBookmark, FiX } from "react-icons/fi";

import type { PublicHandbook } from "@lavieco/shared/content";
import { cn } from "@lavieco/ui";

import { MediaImage } from "@/shared/components/media-image";

import { TINT_CLASS } from "../../constants/config";
import { TEXT } from "../../constants/text";
import { chapterOfPage } from "../../utils/book-math";

const t = TEXT.vi.toc;

/**
 * Table of contents: a drawer on the left on wide screens, a bottom sheet on phones.
 * Solid background over a dimmed scrim, so nothing of the page shows through. Esc and
 * the scrim close it; focus moves in on open and back to the opener on close.
 */
export function TocPanel({
  book,
  current,
  bookmarkKeys,
  tabLabels,
  onGo,
  onCover,
  onClose,
}: {
  book: PublicHandbook;
  /** Page on screen; null while a cover is shown. */
  current: number | null;
  bookmarkKeys: readonly string[];
  /** Short chapter labels ("MĐ", "01", "PL"), the same as the tabs beside the book. */
  tabLabels: ReadonlyMap<string, string>;
  onGo: (page: number) => void;
  onCover: (side: "front" | "back") => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"chapters" | "bookmarks">("chapters");
  const panel = useRef<HTMLDivElement>(null);
  const currentChapter = current ? chapterOfPage(book.chapters, current) : null;
  const covers = (["front", "back"] as const).flatMap((side) => {
    const image = book.covers[side];
    return image ? [{ side, image }] : [];
  });
  const marked = book.pages.filter((page) => bookmarkKeys.includes(page.key));

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button, a")?.focus();
    return () => opener?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={t.close}
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-scrim-solid"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="handbook-toc-title"
        className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl bg-soft-white shadow-dock-scrolled md:inset-y-0 md:left-0 md:right-auto md:max-h-none md:w-[24rem] md:rounded-none md:rounded-r-3xl"
      >
        <div
          className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-deep-blue/20 md:hidden"
          aria-hidden="true"
        />
        <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
          <h2 id="handbook-toc-title" className="font-display text-headline-sm text-deep-blue">
            {t.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="grid size-11 place-items-center rounded-full text-deep-blue hover:bg-mint-mist"
          >
            <FiX aria-hidden="true" size={20} />
          </button>
        </header>
        <div role="tablist" aria-label={t.title} className="flex gap-2 px-5 pb-3">
          {(["chapters", "bookmarks"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm",
                tab === id
                  ? "bg-deep-blue font-semibold text-soft-white"
                  : "border border-hairline bg-white text-deep-blue",
              )}
            >
              {id === "bookmarks" ? <FiBookmark aria-hidden="true" size={14} /> : null}
              {t.tabs[id]}
              {id === "bookmarks" && marked.length > 0 ? ` (${marked.length})` : ""}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
          {tab === "chapters" ? (
            <>
              {covers.length > 0 ? (
                <div className="mb-2 flex gap-2 px-2" aria-label={t.covers} role="group">
                  {covers.map(({ side, image }) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => onCover(side)}
                      className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl border border-hairline bg-white p-1.5 text-left text-sm font-semibold text-deep-blue hover:bg-mint-mist"
                    >
                      <span className="relative h-11 w-8 shrink-0 overflow-hidden rounded-md bg-deep-blue">
                        <MediaImage
                          publicId={image.publicId}
                          alt=""
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </span>
                      {side === "front" ? TEXT.vi.reader.frontCover : TEXT.vi.reader.backCover}
                    </button>
                  ))}
                </div>
              ) : null}
              <ol className="space-y-1">
                {book.chapters.map((chapter) => {
                  const active = currentChapter?.id === chapter.id;
                  const cover = book.pages[chapter.firstPage - 1];
                  return (
                    <li key={chapter.id}>
                      <button
                        type="button"
                        onClick={() => onGo(chapter.firstPage)}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "flex min-h-16 w-full items-center gap-3 rounded-2xl p-2 text-left",
                          active ? "bg-mint-mist" : "hover:bg-white",
                        )}
                      >
                        <span className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-paper">
                          {cover ? (
                            <MediaImage
                              publicId={cover.image.publicId}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-meta",
                                TINT_CLASS[chapter.tint],
                              )}
                            >
                              {tabLabels.get(chapter.id)}
                            </span>
                            {active ? (
                              <span className="text-meta uppercase text-emerald-ink">
                                {t.reading}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 block truncate text-sm font-semibold text-deep-blue">
                            {chapter.title}
                          </span>
                          <span className="block text-body-sm text-charcoal/65">
                            {t.pages(chapter.pageCount)}
                          </span>
                        </span>
                        <span className="shrink-0 text-body-sm text-deep-blue/70">
                          {t.page(chapter.firstPage)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : marked.length === 0 ? (
            <p className="px-2 py-6 text-body-sm text-charcoal/70">{t.noBookmarks}</p>
          ) : (
            <ul className="space-y-1">
              {marked.map((page) => (
                <li key={page.key}>
                  <button
                    type="button"
                    onClick={() => onGo(page.number)}
                    className="flex min-h-16 w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-white"
                  >
                    <span className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-paper">
                      <MediaImage
                        publicId={page.image.publicId}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-deep-blue">
                      {page.title}
                    </span>
                    <span className="shrink-0 text-body-sm text-deep-blue/70">
                      {t.page(page.number)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
