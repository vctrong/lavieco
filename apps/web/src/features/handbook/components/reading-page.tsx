import Link from "next/link";
import { FiArrowLeft, FiArrowRight, FiBookOpen } from "react-icons/fi";

import type { PublicHandbookPageDetail } from "@lavieco/shared/content";

import { MediaImage } from "@/shared/components/media-image";

import { COVER_HREF, pageHref, readerHref } from "../constants/config";
import { TEXT } from "../constants/text";

const t = TEXT.vi.reading;

/**
 * `/cam-nang/trang/[key]`: one page as a plain article, rendered on the server. It is
 * the indexable address of the page (SEO, share previews), and the "chế độ đọc" for
 * people who prefer scrolling text, use a screen reader, or have JavaScript off.
 */
export function ReadingPage({ detail }: { detail: PublicHandbookPageDetail }) {
  const { page, chapter, book, previous, next } = detail;
  const paragraphs = detail.text
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

  return (
    <article className="bg-soft-white pb-24 pt-dock-clearance">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <nav aria-label={t.breadcrumb} className="text-body-sm text-deep-blue/70">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href={COVER_HREF} className="hover:text-emerald-ink">
                {book.title}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>{chapter.title}</li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{t.pageNumber(page.number)}</li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <figure className="lg:sticky lg:top-24 lg:self-start">
            <div
              className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl bg-paper shadow-gallery"
              style={{ aspectRatio: `${page.image.width} / ${page.image.height}` }}
            >
              <MediaImage
                publicId={page.image.publicId}
                alt={page.alt || page.title}
                fill
                priority
                sizes="(min-width: 1024px) 448px, 92vw"
                className="object-cover"
              />
            </div>
          </figure>

          <div>
            <p className="text-label-caps uppercase text-emerald-ink">{chapter.title}</p>
            <h1 className="mt-2 font-display text-headline-lg-mobile text-deep-blue md:text-headline-lg">
              {page.title}
            </h1>
            <div className="mt-6 space-y-4 text-body-lg text-charcoal/85">
              {paragraphs.length > 0 ? (
                paragraphs.map((text, index) => <p key={index}>{text}</p>)
              ) : (
                <p className="text-charcoal/70">{t.noText}</p>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={readerHref(page.number)}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-emerald-brand px-6 text-sm font-bold text-charcoal shadow-emerald-cta"
              >
                <FiBookOpen aria-hidden="true" size={17} />
                {t.openInBook}
              </Link>
            </div>
          </div>
        </div>

        <nav
          aria-label={t.pagesNav}
          className="mt-14 grid gap-3 border-t border-hairline pt-6 sm:grid-cols-2"
        >
          {previous ? (
            <Link
              href={pageHref(previous.key)}
              rel="prev"
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-hairline bg-white px-4 text-deep-blue hover:bg-mint-mist"
            >
              <FiArrowLeft aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-meta uppercase text-deep-blue/60">{t.previous}</span>
                <span className="block truncate text-sm font-semibold">{previous.title}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={pageHref(next.key)}
              rel="next"
              className="flex min-h-14 items-center justify-end gap-3 rounded-2xl border border-hairline bg-white px-4 text-right text-deep-blue hover:bg-mint-mist"
            >
              <span className="min-w-0">
                <span className="block text-meta uppercase text-deep-blue/60">{t.next}</span>
                <span className="block truncate text-sm font-semibold">{next.title}</span>
              </span>
              <FiArrowRight aria-hidden="true" />
            </Link>
          ) : null}
        </nav>
      </div>
    </article>
  );
}
