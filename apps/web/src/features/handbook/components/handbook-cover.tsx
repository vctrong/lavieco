import Link from "next/link";
import { FiArrowRight, FiBookOpen, FiCalendar, FiMessageCircle, FiPackage } from "react-icons/fi";

import type { PublicHandbook } from "@lavieco/shared/content";
import { cn } from "@lavieco/ui";

import { MediaImage } from "@/shared/components/media-image";

import { MORE_LINKS, TINT_CLASS, readerHref } from "../constants/config";
import { TEXT } from "../constants/text";
import { ResumeLink } from "./resume-link";

const c = TEXT.vi.cover;
const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

const MORE = [
  { id: "kit", href: MORE_LINKS.kit, icon: FiPackage },
  { id: "agent", href: MORE_LINKS.agent, icon: FiMessageCircle },
  { id: "workshop", href: MORE_LINKS.workshop, icon: FiCalendar },
] as const;

/** `/cam-nang` (01-bia layout): the closed book, how to start, the chapters, what next. */
export function HandbookCover({ book }: { book: PublicHandbook }) {
  const cover = book.pages[0];
  const facts = [
    { label: c.facts.pages, value: c.facts.pagesValue(book.pages.length) },
    { label: c.facts.chapters, value: c.facts.chaptersValue(book.chapters.length) },
    { label: c.facts.updated, value: dateFormat.format(new Date(book.publishedAt)) },
    { label: c.facts.price, value: c.facts.priceValue },
  ];

  return (
    <div className="bg-soft-white pb-24 pt-dock-clearance">
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-10 md:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:py-16">
        <Link
          href={readerHref(1)}
          aria-label={c.open}
          className="group mx-auto block w-full max-w-[22rem] [perspective:1600px]"
        >
          <div className="relative transition-transform duration-500 [transform-style:preserve-3d] [transform:rotateY(-16deg)_rotateX(4deg)] group-hover:[transform:rotateY(-8deg)_rotateX(2deg)] group-focus-visible:[transform:rotateY(-8deg)] motion-reduce:transition-none">
            {/* Page block: the thickness of the closed book on the right edge. */}
            <div
              aria-hidden="true"
              className="absolute inset-y-2 -right-3 w-4 rounded-r-md bg-[repeating-linear-gradient(90deg,var(--color-paper)_0_2px,var(--color-paper-edge)_2px_3px)] [transform:translateZ(-8px)]"
            />
            <div className="relative aspect-[1/1.414] overflow-hidden rounded-r-xl rounded-l-sm bg-paper shadow-gallery">
              {cover ? (
                <MediaImage
                  publicId={cover.image.publicId}
                  alt={c.bookAlt(book.title)}
                  fill
                  priority
                  sizes="(min-width: 1024px) 352px, 80vw"
                  className="object-cover"
                />
              ) : null}
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-charcoal/25 to-transparent"
              />
            </div>
            <span
              aria-hidden="true"
              className="absolute -top-2 left-8 h-16 w-3 rounded-b-sm bg-emerald-brand shadow-sm"
            />
          </div>
        </Link>

        <div>
          <p className="text-label-caps uppercase text-emerald-ink">{c.eyebrow}</p>
          <h1 className="mt-3 font-display text-display-hero-mobile text-deep-blue md:text-display-hero">
            {book.title}
          </h1>
          {book.description ? (
            <p className="mt-5 max-w-xl text-body-lg text-charcoal/80">{book.description}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={readerHref(1)}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-emerald-brand px-7 text-sm font-bold text-charcoal shadow-emerald-cta transition-transform hover:scale-[1.02] motion-reduce:transition-none"
            >
              <FiBookOpen aria-hidden="true" size={18} />
              {c.open}
            </Link>
            <ResumeLink slug={book.slug} total={book.pages.length} />
          </div>
          <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-2xl border border-hairline bg-white px-4 py-3"
              >
                <dt className="text-meta uppercase text-deep-blue/60">{fact.label}</dt>
                <dd className="mt-1 text-sm font-semibold text-deep-blue">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="handbook-chapters" className="bg-mint-mist/50 py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2
            id="handbook-chapters"
            className="font-display text-headline-lg-mobile text-deep-blue md:text-headline-lg"
          >
            {c.chaptersHeading}
          </h2>
          <p className="mt-3 max-w-2xl text-body-md text-charcoal/75">{c.chaptersLead}</p>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {book.chapters.map((chapter, index) => {
              const first = book.pages[chapter.firstPage - 1];
              const last = chapter.firstPage + chapter.pageCount - 1;
              return (
                <li key={chapter.id}>
                  <Link
                    href={readerHref(chapter.firstPage)}
                    aria-label={c.openChapter(chapter.title)}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-ambient transition-shadow hover:shadow-ambient-hover motion-reduce:transition-none"
                  >
                    <span className="relative block aspect-[4/3] overflow-hidden bg-paper">
                      {first ? (
                        <MediaImage
                          publicId={first.image.publicId}
                          alt=""
                          fill
                          sizes="(min-width: 1280px) 220px, (min-width: 640px) 45vw, 90vw"
                          className="object-cover object-top transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                        />
                      ) : null}
                      <span
                        className={cn(
                          "absolute left-3 top-3 rounded-full px-2.5 py-1 text-meta uppercase",
                          TINT_CLASS[chapter.tint],
                        )}
                      >
                        {c.chapterLabel(index + 1)}
                      </span>
                    </span>
                    <span className="flex flex-1 flex-col gap-2 p-4">
                      <span className="text-meta uppercase text-deep-blue/60">
                        {c.pageRange(chapter.firstPage, last)}
                      </span>
                      <span className="font-display text-title-editorial text-deep-blue">
                        {chapter.title}
                      </span>
                      <span className="mt-auto flex items-center justify-between pt-2 text-body-sm text-charcoal/70">
                        {c.pageCount(chapter.pageCount)}
                        <FiArrowRight aria-hidden="true" className="text-emerald-ink" />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section aria-labelledby="handbook-more" className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <h2 id="handbook-more" className="sr-only">
          {c.more.heading}
        </h2>
        <ul className="grid gap-5 md:grid-cols-3">
          {MORE.map(({ id, href, icon: Icon }) => {
            const card = c.more[id];
            const featured = id === "agent";
            return (
              <li key={id}>
                <Link
                  href={href}
                  className={cn(
                    "flex h-full flex-col gap-3 rounded-3xl p-6 transition-transform hover:-translate-y-0.5 motion-reduce:transition-none",
                    featured
                      ? "bg-deep-blue text-soft-white"
                      : "border border-hairline bg-white text-deep-blue",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-11 place-items-center rounded-2xl",
                      featured ? "bg-soft-white/10 text-canary" : "bg-mint-mist text-emerald-ink",
                    )}
                  >
                    <Icon aria-hidden="true" size={20} />
                  </span>
                  <span
                    className={cn(
                      "text-meta uppercase",
                      featured ? "text-mint-mist" : "text-deep-blue/60",
                    )}
                  >
                    {card.eyebrow}
                  </span>
                  <span className="font-display text-headline-sm">{card.title}</span>
                  <span
                    className={cn(
                      "text-body-sm",
                      featured ? "text-soft-white/85" : "text-charcoal/75",
                    )}
                  >
                    {card.body}
                  </span>
                  <span
                    className={cn(
                      "mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold",
                      featured ? "text-canary" : "text-emerald-ink",
                    )}
                  >
                    {card.cta}
                    <FiArrowRight aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
