"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";

import {
  HANDBOOK_LIMITS,
  type HandbookSearchResult,
  type PublicHandbook,
} from "@lavieco/shared/content";
import { cn } from "@lavieco/ui";

import { MediaImage } from "@/shared/components/media-image";

import { TINT_CLASS } from "../../constants/config";
import { TEXT } from "../../constants/text";

const s = TEXT.vi.search;
const DEBOUNCE_MS = 300;

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: HandbookSearchResult }
  | { status: "error" };

type Hit = HandbookSearchResult["results"][number];

/** The snippet with the matching words marked (ranges come from the service). */
function Snippet({ hit }: { hit: Hit }) {
  const parts: { text: string; mark: boolean }[] = [];
  let at = 0;
  for (const [start, length] of hit.highlights) {
    if (start < at) continue;
    if (start > at) parts.push({ text: hit.snippet.slice(at, start), mark: false });
    parts.push({ text: hit.snippet.slice(start, start + length), mark: true });
    at = start + length;
  }
  parts.push({ text: hit.snippet.slice(at), mark: false });
  return (
    <span className="line-clamp-3 text-body-sm text-charcoal/75">
      {parts.map((part, index) =>
        part.mark ? (
          <mark key={index} className="rounded bg-canary/70 px-0.5 text-charcoal">
            {part.text}
          </mark>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        ),
      )}
    </span>
  );
}

/**
 * "Tìm trong sổ": searches the text of every page (accent-insensitive on the server),
 * results grouped by chapter with a thumbnail, the snippet and the words highlighted.
 * Same shell as the table of contents: drawer on wide screens, bottom sheet on phones.
 */
export function SearchPanel({
  book,
  onGo,
  onClose,
}: {
  book: PublicHandbook;
  onGo: (page: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    input.current?.focus();
    return () => opener?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < HANDBOOK_LIMITS.queryMin) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState({ status: "loading" });
      try {
        const response = await fetch(`/api/cam-nang/tim?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as { status: string } & Partial<HandbookSearchResult>;
        if (body.status === "ok" && body.results) {
          setState({ status: "done", result: { query: q, results: body.results } });
        } else setState({ status: "error" });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setState({ status: "error" });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const groups = useMemo(() => {
    if (state.status !== "done") return [];
    return book.chapters
      .map((chapter, index) => ({
        chapter,
        index,
        hits: state.result.results.filter((hit) => hit.chapterId === chapter.id),
      }))
      .filter((group) => group.hits.length > 0);
  }, [state, book.chapters]);

  const short = query.trim().length > 0 && query.trim().length < HANDBOOK_LIMITS.queryMin;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={s.close}
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-scrim-solid"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="handbook-search-title"
        className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-3xl bg-soft-white shadow-dock-scrolled md:inset-y-0 md:left-0 md:right-auto md:max-h-none md:w-[26rem] md:rounded-none md:rounded-r-3xl"
      >
        <div
          className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-deep-blue/20 md:hidden"
          aria-hidden="true"
        />
        <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 id="handbook-search-title" className="font-display text-headline-sm text-deep-blue">
            {s.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={s.close}
            className="grid size-11 place-items-center rounded-full text-deep-blue hover:bg-mint-mist"
          >
            <FiX aria-hidden="true" size={20} />
          </button>
        </header>
        <form role="search" className="px-5 pb-3" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="handbook-search" className="text-body-sm font-semibold text-deep-blue">
            {s.label}
          </label>
          <div className="relative mt-1.5">
            <FiSearch
              aria-hidden="true"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-deep-blue/60"
            />
            <input
              ref={input}
              id="handbook-search"
              type="search"
              value={query}
              maxLength={HANDBOOK_LIMITS.queryMax}
              placeholder={s.placeholder}
              aria-describedby="handbook-search-hint"
              onChange={(event) => {
                setQuery(event.target.value);
                if (event.target.value.trim().length < HANDBOOK_LIMITS.queryMin)
                  setState({ status: "idle" });
              }}
              className="min-h-12 w-full rounded-full border border-hairline bg-white pl-11 pr-4 text-base text-charcoal placeholder:text-charcoal/45 focus:border-emerald-brand focus:outline-none"
            />
          </div>
          <p id="handbook-search-hint" className="mt-1.5 text-body-sm text-charcoal/60">
            {short ? s.tooShort : s.hint}
          </p>
        </form>
        <div aria-live="polite" className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
          {state.status === "loading" ? (
            <p className="px-2 py-4 text-body-sm text-charcoal/70">{s.searching}</p>
          ) : null}
          {state.status === "error" ? (
            <p className="px-2 py-4 text-body-sm text-error">{s.failed}</p>
          ) : null}
          {state.status === "done" && state.result.results.length === 0 ? (
            <p className="px-2 py-4 text-body-sm text-charcoal/70">{s.none(state.result.query)}</p>
          ) : null}
          {state.status === "done" && state.result.results.length > 0 ? (
            <>
              <p className="px-2 pb-2 text-body-sm text-deep-blue/70">
                {s.count(state.result.results.length)}
              </p>
              {groups.map(({ chapter, index, hits }) => (
                <section key={chapter.id} className="mb-3">
                  <h3 className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-deep-blue">
                    <span
                      className={cn("rounded-full px-2 py-0.5 text-meta", TINT_CLASS[chapter.tint])}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {chapter.title}
                  </h3>
                  <ul className="space-y-1">
                    {hits.map((hit) => {
                      const page = book.pages[hit.number - 1];
                      return (
                        <li key={hit.key}>
                          <button
                            type="button"
                            onClick={() => onGo(hit.number)}
                            aria-label={s.open(hit.number)}
                            className="flex w-full gap-3 rounded-2xl p-2 text-left hover:bg-white"
                          >
                            <span className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-paper">
                              {page ? (
                                <MediaImage
                                  publicId={page.image.publicId}
                                  alt=""
                                  fill
                                  sizes="56px"
                                  className="object-cover"
                                />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-meta uppercase text-deep-blue/60">
                                {s.page(hit.number)}
                              </span>
                              <span className="block truncate text-sm font-semibold text-deep-blue">
                                {hit.title}
                              </span>
                              <Snippet hit={hit} />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
