import Link from "next/link";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiChevronDown,
  FiExternalLink,
  FiMapPin,
  FiVideo,
} from "react-icons/fi";

import type { PublicEventDetail } from "@lavieco/shared/events";
import { Container, Eyebrow, PearlDot } from "@lavieco/ui";

import { EVENTS_PATH, HANDBOOK_PATH } from "../constants/config";
import { TEXT } from "../constants/text";
import { formatSchedule, formatShortDate, formatVnd, paragraphsOf } from "../utils/format";
import { AvailabilityTag, priceLabel } from "./event-card";
import { CoverArt } from "./cover-art";

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="mb-5 font-display text-2xl text-deep-blue md:text-3xl">
      {children}
    </h2>
  );
}

function RegisterBox({ event }: { event: PublicEventDetail }) {
  const t = TEXT.vi.detail;
  const note =
    event.status === "closed" ? t.closed : event.status === "ended" ? t.ended : t.registerSoonNote;
  return (
    <div className="rounded-3xl bg-deep-blue p-6 text-soft-white">
      <p className="font-display text-3xl">{priceLabel(event) ?? ""}</p>
      {/* Registration and tickets open with checkout (docs/05 §9 phase 3). */}
      <button
        type="button"
        disabled
        className="mt-5 w-full cursor-not-allowed rounded-full bg-soft-white/15 px-6 py-3 text-sm font-semibold text-soft-white/80"
      >
        {event.status === "published" ? t.registerSoon : t.register}
      </button>
      <p className="mt-3 text-[12.5px] leading-relaxed text-mint-mist/80">{note}</p>
    </div>
  );
}

/**
 * Public event page, also used by the preview (same rendering, D2). Plain-text content
 * only, rendered as paragraphs: no HTML from the service is ever injected.
 */
export function EventDetail({ event }: { event: PublicEventDetail }) {
  const t = TEXT.vi.detail;
  const Place = event.format === "online" ? FiVideo : FiMapPin;
  const description = paragraphsOf(event.description);
  const safety = paragraphsOf(event.safetyNotes);
  const policy = paragraphsOf(event.cancellationPolicy);

  return (
    <article className="bg-soft-white pb-24 pt-dock-clearance">
      <Container className="pt-8 md:pt-12">
        <Link
          href={EVENTS_PATH}
          className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-deep-blue/70 hover:text-deep-blue"
        >
          <FiArrowLeft aria-hidden="true" size={14} />
          {t.back}
        </Link>

        <header className="grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center">
          <CoverArt
            title={event.title}
            label={event.type?.name.vi}
            radius="arch-lg"
            className="aspect-[4/5] w-full max-w-md shadow-hero-arch-soft"
          />
          <div>
            <Eyebrow className="mb-4 flex items-center gap-2">
              <PearlDot size="sm" tone="emerald" />
              {event.type?.name.vi}
            </Eyebrow>
            <h1 className="font-display text-4xl font-light leading-tight tracking-tight text-deep-blue md:text-6xl">
              {event.title}
            </h1>
            {event.summary ? (
              <p className="mt-5 text-base leading-relaxed text-charcoal/75 md:text-lg">
                {event.summary}
              </p>
            ) : null}
            <dl className="mt-8 space-y-4 text-[15px]">
              <div className="flex items-start gap-3">
                <dt className="sr-only">{t.when}</dt>
                <FiCalendar
                  aria-hidden="true"
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-brand"
                />
                <dd className="text-charcoal">{formatSchedule(event.startAt, event.endAt)}</dd>
              </div>
              <div className="flex items-start gap-3">
                <dt className="sr-only">{t.where}</dt>
                <Place
                  aria-hidden="true"
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-brand"
                />
                <dd className="text-charcoal">
                  {event.format === "online" ? (
                    <>
                      {t.online}
                      <span className="block text-[13px] text-charcoal/60">{t.onlineNote}</span>
                    </>
                  ) : event.venue ? (
                    <>
                      <span className="font-semibold text-deep-blue">{event.venue.name}</span>
                      <span className="block text-charcoal/70">{event.venue.address}</span>
                      {event.venue.mapUrl ? (
                        <a
                          href={event.venue.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-deep-blue underline-offset-4 hover:underline"
                        >
                          {t.map}
                          <FiExternalLink aria-hidden="true" size={12} />
                        </a>
                      ) : null}
                    </>
                  ) : null}
                </dd>
              </div>
            </dl>
            <AvailabilityTag availability={event.availability} className="mt-6 inline-block" />
          </div>
        </header>

        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-14">
            {description.length > 0 ? (
              <section aria-labelledby="ve-chuong-trinh">
                <SectionTitle id="ve-chuong-trinh">{t.about}</SectionTitle>
                <div className="space-y-4 text-[16px] leading-relaxed text-charcoal/85">
                  {description.map((paragraph, index) => (
                    <p key={index} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            {safety.length > 0 ? (
              <section
                aria-labelledby="luu-y-an-toan"
                className="rounded-3xl border border-canary bg-canary/15 p-6"
              >
                <h2
                  id="luu-y-an-toan"
                  className="mb-3 flex items-center gap-2 font-display text-xl text-deep-blue"
                >
                  <FiAlertTriangle aria-hidden="true" size={18} />
                  {t.safety}
                </h2>
                <div className="space-y-3 text-[15px] leading-relaxed text-charcoal/85">
                  {safety.map((paragraph, index) => (
                    <p key={index} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            {event.speakers.length > 0 ? (
              <section aria-labelledby="nguoi-huong-dan">
                <SectionTitle id="nguoi-huong-dan">{t.speakers}</SectionTitle>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {event.speakers.map((speaker, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-4 rounded-2xl border border-hairline bg-white p-4"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mint-mist font-display text-lg text-deep-blue"
                      >
                        {speaker.name.trim().split(/\s+/).at(-1)?.charAt(0)}
                      </span>
                      <div>
                        <p className="font-semibold text-deep-blue">{speaker.name}</p>
                        {speaker.role ? (
                          <p className="text-[13px] text-charcoal/65">{speaker.role}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {event.agenda.length > 0 ? (
              <section aria-labelledby="lich-trinh">
                <SectionTitle id="lich-trinh">{t.agenda}</SectionTitle>
                <ol className="relative space-y-5 border-l border-emerald-brand/30 pl-6">
                  {event.agenda.map((item, index) => (
                    <li key={index} className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[1.85rem] top-1.5 size-3 rounded-full border-2 border-soft-white bg-emerald-brand"
                      />
                      {item.time ? (
                        <p className="text-[12px] font-semibold uppercase tracking-museum text-emerald-brand">
                          {item.time}
                        </p>
                      ) : null}
                      <p className="text-[15px] text-charcoal">{item.title}</p>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {event.faq.length > 0 ? (
              <section aria-labelledby="hoi-dap">
                <SectionTitle id="hoi-dap">{t.faq}</SectionTitle>
                <div className="divide-y divide-hairline rounded-3xl border border-hairline bg-white">
                  {event.faq.map((item, index) => (
                    <details key={index} className="group px-5 py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-deep-blue">
                        {item.question}
                        <FiChevronDown
                          aria-hidden="true"
                          size={16}
                          className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                        />
                      </summary>
                      <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-charcoal/80">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}

            {policy.length > 0 ? (
              <section aria-labelledby="chinh-sach-huy">
                <SectionTitle id="chinh-sach-huy">{t.policy}</SectionTitle>
                <div className="space-y-3 text-[14.5px] leading-relaxed text-charcoal/75">
                  {policy.map((paragraph, index) => (
                    <p key={index} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            {event.kind === "standard" ? <RegisterBox event={event} /> : null}
            {event.ticketTypes.length > 0 ? (
              <section
                aria-labelledby="loai-ve"
                className="rounded-3xl border border-hairline bg-white p-6"
              >
                <h2 id="loai-ve" className="mb-4 font-display text-xl text-deep-blue">
                  {t.tickets}
                </h2>
                <ul className="space-y-4">
                  {event.ticketTypes.map((ticket) => {
                    const saleWindow = t.saleWindow(
                      ticket.saleStartAt ? formatShortDate(ticket.saleStartAt) : null,
                      ticket.saleEndAt ? formatShortDate(ticket.saleEndAt) : null,
                    );
                    return (
                      <li
                        key={ticket.id}
                        className="border-b border-hairline pb-4 last:border-b-0 last:pb-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold text-deep-blue">{ticket.name}</p>
                          <p className="shrink-0 font-display text-lg text-deep-blue">
                            {ticket.price === 0 ? TEXT.vi.card.free : formatVnd(ticket.price)}
                          </p>
                        </div>
                        {ticket.description ? (
                          <p className="mt-1 text-[13px] text-charcoal/65">{ticket.description}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-charcoal/60">
                          <AvailabilityTag availability={ticket.availability} />
                          {saleWindow ? <span>{saleWindow}</span> : null}
                          <span>{t.maxPerOrder(ticket.maxPerOrder)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
            <section className="rounded-3xl bg-mint-mist p-6">
              <p className="text-[14px] leading-relaxed text-deep-blue">{t.educationNote}</p>
              <Link
                href={HANDBOOK_PATH}
                className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-deep-blue hover:text-emerald-brand"
              >
                <FiBookOpen aria-hidden="true" size={14} />
                {t.handbookCta}
                <FiArrowRight aria-hidden="true" size={13} />
              </Link>
            </section>
          </aside>
        </div>
      </Container>
    </article>
  );
}
