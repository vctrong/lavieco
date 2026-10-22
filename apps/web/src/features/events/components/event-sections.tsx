import type { ReactNode } from "react";
import { FiAlertTriangle, FiChevronDown, FiExternalLink, FiMapPin } from "react-icons/fi";

import type { PublicEventDetail } from "@lavieco/shared/events";
import { cn } from "@lavieco/ui";

import { MEDIA_DELIVERY_READY, MediaImage } from "@/shared/components/media-image";

import { BENEFIT_ICON_COMPONENTS } from "../constants/benefit-icons";
import { SECTION_ANCHORS, type DetailSection } from "../constants/config";
import { TEXT } from "../constants/text";
import { paragraphsOf } from "../utils/format";

const t = TEXT.vi.detail;

/** Sections that have something to show, in page order (empty ones never render). */
export function sectionsOf(event: PublicEventDetail): DetailSection[] {
  const has: Record<DetailSection, boolean> = {
    overview: paragraphsOf(event.description).length > 0,
    schedule: event.agenda.length > 0,
    benefits: event.benefits.length > 0,
    instructors: event.speakers.length > 0,
    safety: event.safetyNotes.trim().length > 0,
    policy: event.cancellationRules.length > 0 || event.cancellationPolicy.trim().length > 0,
    faq: event.faq.length > 0,
    map: event.format === "offline" && event.venue !== null,
  };
  return (Object.keys(has) as DetailSection[]).filter((section) => has[section]);
}

function Section({
  section,
  children,
  className,
}: {
  section: DetailSection;
  children: ReactNode;
  className?: string;
}) {
  const id = SECTION_ANCHORS[section];
  return (
    <section id={id} aria-labelledby={`${id}-tieu-de`} className={cn("scroll-mt-44", className)}>
      <h2
        id={`${id}-tieu-de`}
        className="mb-6 font-display text-headline-sm text-deep-blue md:text-headline-md"
      >
        {t.sections[section]}
      </h2>
      {children}
    </section>
  );
}

function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {paragraphsOf(text).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function Overview({ event }: { event: PublicEventDetail }) {
  return (
    <Section section="overview">
      <Paragraphs text={event.description} className="text-body-lg text-charcoal/85" />
    </Section>
  );
}

function Schedule({ event }: { event: PublicEventDetail }) {
  return (
    <Section section="schedule">
      <ol className="relative space-y-4 border-l border-emerald-brand/40 pl-6">
        {event.agenda.map((item, index) => (
          <li key={index} className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-[1.85rem] top-2 size-3 rounded-full border-2 border-soft-white bg-emerald-brand"
            />
            <div className="rounded-pedestal border border-hairline bg-white p-4">
              {item.time ? (
                <p className="text-label-caps uppercase text-emerald-ink">{item.time}</p>
              ) : null}
              <p className="mt-1 font-display text-title-editorial text-deep-blue">{item.title}</p>
              {item.description ? (
                <p className="mt-1 text-body-md text-charcoal/75">{item.description}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Benefits({ event }: { event: PublicEventDetail }) {
  return (
    <Section section="benefits">
      <ul className="grid gap-4 sm:grid-cols-2">
        {event.benefits.map((benefit, index) => {
          const Icon = BENEFIT_ICON_COMPONENTS[benefit.icon];
          return (
            <li key={index} className="rounded-pedestal bg-mint-mist p-5">
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-full bg-white text-emerald-ink"
              >
                <Icon size={18} />
              </span>
              <p className="mt-4 font-display text-title-editorial text-deep-blue">
                {benefit.title}
              </p>
              {benefit.description ? (
                <p className="mt-1 text-body-sm text-charcoal/75">{benefit.description}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/** Initial of the given name (Vietnamese names end with it), for people without a photo. */
const initialOf = (name: string) => name.trim().split(/\s+/).at(-1)?.charAt(0) ?? "";

function Instructors({ event }: { event: PublicEventDetail }) {
  return (
    <Section section="instructors">
      <ul className="space-y-4">
        {event.speakers.map((speaker, index) => (
          <li
            key={index}
            className="flex flex-col gap-4 rounded-pedestal border border-hairline bg-white p-5 sm:flex-row"
          >
            {speaker.avatar && MEDIA_DELIVERY_READY ? (
              <span className="relative size-20 shrink-0 overflow-hidden rounded-full bg-mint-mist">
                <MediaImage
                  publicId={speaker.avatar.publicId}
                  alt={speaker.avatar.alt}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </span>
            ) : (
              <span
                role="img"
                aria-label={TEXT.vi.instructorInitial(speaker.name)}
                className="flex size-20 shrink-0 items-center justify-center rounded-full bg-mint-mist font-display text-headline-sm text-deep-blue"
              >
                {initialOf(speaker.name)}
              </span>
            )}
            <div>
              <p className="font-display text-title-editorial text-deep-blue">{speaker.name}</p>
              {speaker.role ? (
                <p className="text-label-caps uppercase text-emerald-ink">{speaker.role}</p>
              ) : null}
              {speaker.bio ? (
                <p className="mt-2 text-body-md text-charcoal/80">{speaker.bio}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Safety({ event }: { event: PublicEventDetail }) {
  return (
    <Section section="safety">
      <div className="rounded-pedestal border border-canary bg-canary/20 p-5">
        <p className="mb-3 flex items-center gap-2 font-semibold text-deep-blue">
          <FiAlertTriangle aria-hidden="true" size={16} />
          {t.safetyTitle}
        </p>
        <Paragraphs text={event.safetyNotes} className="text-body-md text-charcoal/85" />
      </div>
    </Section>
  );
}

function Policy({ event }: { event: PublicEventDetail }) {
  return (
    <Section section="policy">
      {event.cancellationRules.length > 0 ? (
        <table className="w-full overflow-hidden rounded-pedestal border border-hairline bg-white text-left text-body-md">
          <thead className="bg-mint-mist text-label-caps uppercase text-charcoal/75">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t.policyCondition}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t.policyResult}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {event.cancellationRules.map((rule, index) => (
              <tr key={index}>
                <td className="px-4 py-3 text-charcoal">{rule.condition}</td>
                <td className="px-4 py-3 font-semibold text-deep-blue">{rule.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {event.cancellationPolicy.trim() ? (
        <Paragraphs
          text={event.cancellationPolicy}
          className={cn(
            "text-body-sm text-charcoal/75",
            event.cancellationRules.length > 0 && "mt-4",
          )}
        />
      ) : null}
    </Section>
  );
}

function Faq({ event }: { event: PublicEventDetail }) {
  return (
    <Section section="faq">
      <div className="divide-y divide-hairline rounded-pedestal border border-hairline bg-white">
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
            <p className="mt-3 whitespace-pre-line text-body-md text-charcoal/80">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

/**
 * Address card with a link out. No embedded third-party map: it would need a CSP
 * exception and send every visitor to the map provider.
 */
function MapSection({ event }: { event: PublicEventDetail }) {
  if (!event.venue) return null;
  return (
    <Section section="map">
      <div className="flex flex-col gap-4 rounded-pedestal bg-mint-mist p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-3">
          <FiMapPin aria-hidden="true" size={18} className="mt-1 shrink-0 text-emerald-ink" />
          <span>
            <span className="block font-semibold text-deep-blue">{event.venue.name}</span>
            <span className="text-body-md text-charcoal/80">{event.venue.address}</span>
          </span>
        </p>
        {event.venue.mapUrl ? (
          <a
            href={event.venue.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-deep-blue/25 bg-white px-4 py-2 text-body-sm font-semibold text-deep-blue hover:border-emerald-brand sm:self-auto"
          >
            {t.openMap}
            <FiExternalLink aria-hidden="true" size={13} />
          </a>
        ) : null}
      </div>
    </Section>
  );
}

/** Photos of the programme, shown once it has taken place. */
export function Gallery({ event }: { event: PublicEventDetail }) {
  if (event.gallery.length === 0 || !MEDIA_DELIVERY_READY) return null;
  return (
    <section aria-labelledby="hinh-anh" className="scroll-mt-44">
      <h2
        id="hinh-anh"
        className="mb-6 font-display text-headline-sm text-deep-blue md:text-headline-md"
      >
        {t.sections.gallery}
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {event.gallery.map((image) => (
          <li
            key={image.mediaId}
            className="relative aspect-square overflow-hidden rounded-2xl bg-mint-mist"
          >
            <MediaImage
              publicId={image.publicId}
              alt={image.alt}
              fill
              sizes="(min-width: 768px) 22vw, 46vw"
              className="object-cover"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

const RENDER: Record<DetailSection, (props: { event: PublicEventDetail }) => ReactNode> = {
  overview: Overview,
  schedule: Schedule,
  benefits: Benefits,
  instructors: Instructors,
  safety: Safety,
  policy: Policy,
  faq: Faq,
  map: MapSection,
};

/** The content column: every section with content, in order. */
export function EventSections({
  event,
  sections,
}: {
  event: PublicEventDetail;
  sections: DetailSection[];
}) {
  return (
    <div className="space-y-16">
      {sections.map((section) => {
        const Render = RENDER[section];
        return <Render key={section} event={event} />;
      })}
    </div>
  );
}
