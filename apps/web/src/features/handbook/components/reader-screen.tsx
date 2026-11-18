"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiSearch, FiShare2, FiVolume2, FiVolumeX } from "react-icons/fi";

import type {
  PublicHandbook,
  PublicHandbookHotspot,
  PublicHandbookPage,
} from "@lavieco/shared/content";

import { pageHref } from "../constants/config";
import { TEXT } from "../constants/text";
import { useFlipSound } from "../hooks/use-flip-sound";
import { agentHrefFor } from "../utils/links";
import { sharePage } from "../utils/share";
import { HandbookReader, type ReaderApi } from "./reader/handbook-reader";
import { HotspotLayer } from "./reader/hotspot-layer";
import { IconButton } from "./reader/icon-button";
import { SearchPanel } from "./reader/search-panel";
import { VideoDialog } from "./reader/video-dialog";

const r = TEXT.vi.reader;

/** "Hỏi LaviAgent về trang này": the page key travels, never its text (ADR-0029). */
const agentHref = (page: PublicHandbookPage) => agentHrefFor(page.key);

type Video = PublicHandbookHotspot & {
  target: { type: "video"; provider: "youtube" | "tiktok"; videoId: string };
};

/** The reading screen with everything the published book offers. */
export function HandbookReaderScreen({
  book,
  initialPage,
  preview = false,
}: {
  book: PublicHandbook;
  initialPage: number;
  preview?: boolean;
}) {
  const sound = useFlipSound(book.slug);
  const [searchOpen, setSearchOpen] = useState(false);
  const [video, setVideo] = useState<Video | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const say = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  }, []);

  const share = async (page: PublicHandbookPage) => {
    const outcome = await sharePage({
      url: new URL(pageHref(page.key), window.location.origin).toString(),
      title: TEXT.vi.share.title(page.number, book.title),
      text: TEXT.vi.share.text,
    });
    if (outcome === "copied") say(TEXT.vi.share.copied);
    if (outcome === "failed") say(TEXT.vi.share.copyFailed);
  };

  const panelOpen = searchOpen || video !== null;

  return (
    <>
      <HandbookReader
        book={book}
        initialPage={initialPage}
        preview={preview}
        onPanelClose={() => {
          setSearchOpen(false);
          setVideo(null);
        }}
        extras={{
          agentHref: preview ? undefined : agentHref,
          onTurnStart: sound.play,
          topActions: (page) => (
            <>
              {!preview ? (
                <IconButton label={r.search} onClick={() => setSearchOpen(true)}>
                  <FiSearch aria-hidden="true" size={18} />
                </IconButton>
              ) : null}
              <IconButton
                label={sound.on ? r.soundOff : r.soundOn}
                aria-pressed={sound.on}
                active={sound.on}
                onClick={sound.toggle}
              >
                {sound.on ? (
                  <FiVolume2 aria-hidden="true" size={18} />
                ) : (
                  <FiVolumeX aria-hidden="true" size={18} />
                )}
              </IconButton>
              {!preview ? (
                <IconButton label={r.share} onClick={() => void share(page)}>
                  <FiShare2 aria-hidden="true" size={18} />
                </IconButton>
              ) : null}
            </>
          ),
          renderOverlay: (page, api: ReaderApi) => (
            <HotspotLayer
              page={page}
              reveal={api.reveal}
              onPage={api.go}
              onVideo={(spot) => setVideo(spot as Video)}
            />
          ),
        }}
        panel={
          panelOpen
            ? (api) =>
                searchOpen ? (
                  <SearchPanel
                    book={book}
                    onGo={(page) => {
                      setSearchOpen(false);
                      api.go(page);
                    }}
                    onClose={() => setSearchOpen(false)}
                  />
                ) : video ? (
                  <VideoDialog
                    provider={video.target.provider}
                    videoId={video.target.videoId}
                    label={video.label}
                    onClose={() => setVideo(null)}
                  />
                ) : null
            : undefined
        }
      />
      <p
        role="status"
        aria-live="polite"
        className={
          notice
            ? "pointer-events-none fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-charcoal px-4 py-2 text-body-sm text-soft-white shadow-ambient"
            : "sr-only"
        }
      >
        {notice}
      </p>
    </>
  );
}

/** The draft in preview: same reader, nothing remembered, no address changes. */
export function HandbookPreviewScreen({ book }: { book: PublicHandbook }) {
  return <HandbookReaderScreen book={book} initialPage={1} preview />;
}
