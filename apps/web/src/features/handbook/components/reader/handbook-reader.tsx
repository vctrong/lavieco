"use client";

import { useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  FiArrowLeft,
  FiBookmark,
  FiChevronLeft,
  FiChevronRight,
  FiList,
  FiMaximize,
  FiMessageCircle,
  FiMinimize,
} from "react-icons/fi";

import type { PublicHandbook, PublicHandbookPage } from "@lavieco/shared/content";
import { cn } from "@lavieco/ui";

import { MediaImage } from "@/shared/components/media-image";

import { COVER_HREF, TINT_CLASS, readerHref } from "../../constants/config";
import { TEXT } from "../../constants/text";
import { usePageSize, useSpreadLayout } from "../../hooks/use-book-layout";
import { bookmarksSnapshot, rememberPage, subscribeBookmarks, toggleBookmark } from "../../storage";
import {
  chapterOfPage,
  firstPageOf,
  pagesOfSpread,
  progressOf,
  spreadIndexOf,
} from "../../utils/book-math";
import { FlipBook, type TurnFn } from "./flip-book";
import { IconButton } from "./icon-button";
import { TocPanel } from "./toc-panel";

const r = TEXT.vi.reader;

/** Space kept beside the spread for the turn buttons and chapter tabs (02-doc layout). */
const SPREAD_RESERVE = 220;
const SINGLE_RESERVE = 16;

/** What extras may do with the reader. */
export type ReaderApi = {
  go: (page: number) => void;
  /** True for a moment after a tap on a page: hotspots show where they are. */
  reveal: boolean;
};

export type ReaderExtras = {
  /** Extra icon buttons of the top bar (search, sound, share). */
  topActions?: (page: PublicHandbookPage, api: ReaderApi) => ReactNode;
  /** Layer drawn over a page (hotspots). */
  renderOverlay?: (page: PublicHandbookPage, api: ReaderApi) => ReactNode;
  /** Called when a page starts turning (page-turn sound). */
  onTurnStart?: () => void;
  /** Where "Hỏi LaviAgent" leads for this page. */
  agentHref?: (page: PublicHandbookPage) => string;
};

/**
 * `/cam-nang/doc` (UC-02): the reading screen. Two pages on wide landscape screens,
 * one page on phones and portrait tablets, switching live on rotation. ←/→ turn pages,
 * Esc closes panels, a tap in the middle of a page hides or shows the bars on phones.
 */
export function HandbookReader({
  book,
  initialPage,
  preview = false,
  extras = {},
  panel,
  onPanelClose,
}: {
  book: PublicHandbook;
  initialPage: number;
  preview?: boolean;
  extras?: ReaderExtras;
  /** A panel opened by an extra (search, video), shown over the reader. */
  panel?: (api: ReaderApi) => ReactNode;
  onPanelClose?: () => void;
}) {
  const total = book.pages.length;
  const spread = useSpreadLayout();
  const reduced = useReducedMotion() ?? false;
  const stage = useRef<HTMLDivElement>(null);
  const first = book.pages[0];
  const ratio = first ? first.image.height / first.image.width : Math.SQRT2;
  const size = usePageSize(stage, spread ? 2 : 1, ratio, spread ? SPREAD_RESERVE : SINGLE_RESERVE);

  const [page, setPage] = useState(initialPage);
  const [tocOpen, setTocOpen] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const marksSnapshot = useSyncExternalStore(
    subscribeBookmarks,
    () => bookmarksSnapshot(book.slug),
    () => "",
  );
  const marks = useMemo(() => (marksSnapshot ? marksSnapshot.split(",") : []), [marksSnapshot]);
  const turn = useRef<TurnFn | null>(null);
  const [reveal, setReveal] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showHotspots = () => {
    setReveal(true);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setReveal(false), 1600);
  };

  const visible = spread ? pagesOfSpread(spreadIndexOf(page), total) : { left: page, right: null };
  const shown = book.pages[(spread ? firstPageOf(visible) : page) - 1] ?? first;
  const chapter = chapterOfPage(book.chapters, page);
  const bookmarked = shown ? marks.includes(shown.key) : false;

  // Address bar and "đọc tiếp" follow the page, without a navigation.
  useEffect(() => {
    if (preview) return;
    document.title = TEXT.vi.meta.readerTitle(page);
    window.history.replaceState(window.history.state, "", readerHref(page));
    rememberPage(book.slug, page);
  }, [page, preview, book.slug]);

  const go = useCallback(
    (target: number) => {
      setPage(Math.min(Math.max(1, target), total));
      setTocOpen(false);
    },
    [total],
  );

  // Keyboard: ←/→ turn, Esc closes a panel.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Esc always closes a panel, even while typing in the search field.
      if (event.key === "Escape") {
        setTocOpen(false);
        onPanelClose?.();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (tocOpen || panel) return;
      if (event.key === "ArrowRight") turn.current?.("next");
      if (event.key === "ArrowLeft") turn.current?.("prev");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tocOpen, panel, onPanelClose]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  const api: ReaderApi = { go, reveal };
  const pageLabel = spread ? r.spreadOf(visible.left, visible.right, total) : r.pageOf(page, total);
  const barsHidden = controlsHidden && !spread;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-soft-white">
      {preview ? (
        <p className="bg-canary px-4 py-1.5 text-center text-body-sm font-semibold text-charcoal">
          {r.preview}
        </p>
      ) : null}

      {/* Top bar: one line, icons only (02-doc). */}
      <header
        className={cn(
          "relative z-30 flex h-14 shrink-0 items-center gap-1 border-b border-hairline bg-soft-white/95 px-2 transition-[transform,opacity] duration-200 motion-reduce:transition-none md:px-4",
          barsHidden && "pointer-events-none -translate-y-full opacity-0",
        )}
      >
        <Link
          href={COVER_HREF}
          aria-label={r.backToCover}
          className="grid size-11 shrink-0 place-items-center rounded-full text-deep-blue hover:bg-mint-mist"
        >
          <FiArrowLeft aria-hidden="true" size={20} />
        </Link>
        <p className="min-w-0 flex-1 truncate px-1 text-sm text-deep-blue">
          <span className="font-display">{book.title}</span>
          {chapter ? (
            <span className="hidden text-deep-blue/60 sm:inline"> · {chapter.title}</span>
          ) : null}
        </p>
        <IconButton label={r.toc} onClick={() => setTocOpen(true)}>
          <FiList aria-hidden="true" size={19} />
        </IconButton>
        {shown ? extras.topActions?.(shown, api) : null}
        {shown && !preview ? (
          <IconButton
            label={bookmarked ? r.unbookmark : r.bookmark}
            aria-pressed={bookmarked}
            active={bookmarked}
            onClick={() => toggleBookmark(book.slug, shown.key)}
          >
            <FiBookmark
              aria-hidden="true"
              size={18}
              className={bookmarked ? "fill-current" : undefined}
            />
          </IconButton>
        ) : null}
        <IconButton
          label={fullscreen ? r.exitFullscreen : r.fullscreen}
          onClick={toggleFullscreen}
          className="hidden sm:grid"
        >
          {fullscreen ? (
            <FiMinimize aria-hidden="true" size={18} />
          ) : (
            <FiMaximize aria-hidden="true" size={18} />
          )}
        </IconButton>
      </header>

      {/* The book, as large as the screen allows, never cropped. */}
      <div
        ref={stage}
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 py-3 md:px-6 md:py-5"
      >
        {size ? (
          <div className="flex items-center gap-3 md:gap-5">
            {spread ? (
              <IconButton
                label={r.previous}
                onClick={() => turn.current?.("prev")}
                disabled={page <= 1}
                className="bg-white shadow-ambient"
              >
                <FiChevronLeft aria-hidden="true" size={22} />
              </IconButton>
            ) : null}
            <div
              role="region"
              aria-roledescription={r.bookRole}
              aria-label={book.title}
              className="relative"
            >
              {spread && visible.left !== null ? (
                <span
                  aria-hidden="true"
                  className="absolute -top-2 left-1/2 z-30 h-20 w-3.5 -translate-x-1/2 rounded-b-sm bg-emerald-brand shadow-sm"
                />
              ) : null}
              <FlipBook
                pages={book.pages}
                spread={spread}
                size={size}
                current={page}
                reduced={reduced}
                turnRef={turn}
                onTurned={setPage}
                onTurnStart={extras.onTurnStart}
                renderOverlay={
                  extras.renderOverlay ? (item) => extras.renderOverlay?.(item, api) : undefined
                }
                zoomEnabled={!spread}
                onTap={(zone) => {
                  showHotspots();
                  if (spread && zone === "left") turn.current?.("prev");
                  else if (spread && zone === "right") turn.current?.("next");
                  else if (!spread) setControlsHidden((hidden) => !hidden);
                }}
              />
              {spread ? (
                <nav
                  aria-label={r.chapterTabs}
                  className="absolute inset-y-6 left-full ml-3.5 flex w-11 flex-col gap-1.5"
                >
                  {book.chapters.map((item, index) => {
                    const active = item.id === chapter?.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => go(item.firstPage)}
                        aria-label={item.title}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "group/tab relative flex min-h-0 max-h-16 flex-1 items-center justify-center rounded-r-lg text-meta shadow-sm transition-transform motion-reduce:transition-none",
                          TINT_CLASS[item.tint],
                          active
                            ? "translate-x-1 ring-2 ring-emerald-ink"
                            : "hover:translate-x-0.5",
                        )}
                      >
                        {String(index + 1).padStart(2, "0")}
                        <span className="pointer-events-none absolute left-full top-1/2 z-30 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-charcoal px-2 py-1 text-meta text-soft-white group-hover/tab:block group-focus-visible/tab:block">
                          {item.title}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              ) : null}
            </div>
            {spread ? (
              <IconButton
                label={r.next}
                onClick={() => turn.current?.("next")}
                disabled={spread ? visible.right === null || visible.right >= total : page >= total}
                className="ml-12 bg-white shadow-ambient"
              >
                <FiChevronRight aria-hidden="true" size={22} />
              </IconButton>
            ) : null}
          </div>
        ) : null}
        <p aria-live="polite" className="sr-only">
          {pageLabel}
        </p>
      </div>

      {/* Bottom bar: thumbnails, progress, LaviAgent (never covered by a floating button). */}
      <footer
        className={cn(
          "relative z-30 shrink-0 border-t border-hairline bg-soft-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 transition-[transform,opacity] duration-200 motion-reduce:transition-none md:px-6",
          barsHidden && "pointer-events-none translate-y-full opacity-0",
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 md:gap-5">
          <Thumbnails book={book} visible={visible} onGo={go} reduced={reduced} />
          <div className="hidden min-w-[9rem] flex-col gap-1 sm:flex">
            <div
              role="progressbar"
              aria-label={r.progress}
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={page}
              className="h-1.5 w-full overflow-hidden rounded-full bg-mint-mist"
            >
              <div
                className="h-full origin-left rounded-full bg-emerald-brand transition-transform motion-reduce:transition-none"
                style={{ transform: `scaleX(${Math.max(0.02, progressOf(page, total))})` }}
              />
            </div>
            <span className="text-body-sm text-deep-blue">{pageLabel}</span>
          </div>
          {shown && extras.agentHref ? (
            <Link
              href={extras.agentHref(shown)}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-deep-blue px-4 text-sm font-semibold text-soft-white hover:bg-deep-blue/90"
            >
              <FiMessageCircle aria-hidden="true" size={17} className="text-canary" />
              <span className="hidden md:inline">{r.askAgent}</span>
              <span className="md:hidden">{r.askAgentShort}</span>
            </Link>
          ) : null}
        </div>
      </footer>

      {tocOpen ? (
        <TocPanel
          book={book}
          current={page}
          bookmarkKeys={marks}
          onGo={go}
          onClose={() => setTocOpen(false)}
        />
      ) : null}
      {panel?.(api)}
    </div>
  );
}

function Thumbnails({
  book,
  visible,
  onGo,
  reduced,
}: {
  book: PublicHandbook;
  visible: { left: number | null; right: number | null };
  onGo: (page: number) => void;
  reduced: boolean;
}) {
  const list = useRef<HTMLOListElement>(null);
  const anchor = visible.left ?? visible.right ?? 1;
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-page="${anchor}"]`)?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: reduced ? "auto" : "smooth",
    });
  }, [anchor, reduced]);
  return (
    <ol
      ref={list}
      aria-label={r.thumbnails}
      className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1 [scrollbar-width:none]"
    >
      {book.pages.map((item) => {
        const current = item.number === visible.left || item.number === visible.right;
        return (
          <li key={item.key} data-page={item.number} className="shrink-0">
            <button
              type="button"
              onClick={() => onGo(item.number)}
              aria-label={r.goTo(item.number)}
              aria-current={current ? "page" : undefined}
              className={cn(
                "relative block h-14 w-10 overflow-hidden rounded-md bg-paper ring-offset-1 md:h-16 md:w-11",
                current ? "ring-2 ring-emerald-brand" : "opacity-70 hover:opacity-100",
              )}
            >
              <MediaImage
                publicId={item.image.publicId}
                alt=""
                fill
                loading="lazy"
                sizes="44px"
                className="object-cover"
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
