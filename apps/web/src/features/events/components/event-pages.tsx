import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FiCheck, FiEye } from "react-icons/fi";

import { Container, Eyebrow, PearlDot } from "@lavieco/ui";

import { publicEnv } from "@/lib/env.public";
import { JsonLd } from "@/shared/components/json-ld";

import { eventPath } from "../constants/config";
import { TEXT } from "../constants/text";
import { getAttendeeCount, getEvent, getPreview, listRelated } from "../server/events";
import { hasMemberSession } from "../server/member";
import { eventJsonLd, shareImageOf } from "../utils/seo";
import { EventDetail } from "./event-detail";

const pageUrlOf = (slug: string) => new URL(eventPath(slug), publicEnv.siteUrl).toString();

/** `/chuong-trinh/[slug]`: published, closed, ended or cancelled events (404 otherwise). */
export async function EventDetailPage({ slug }: { slug: string }) {
  const event = await getEvent(slug);
  if (!event) notFound();
  const [attendeeCount, related, signedIn] = await Promise.all([
    event.state === "ended" ? getAttendeeCount(slug) : Promise.resolve(null),
    listRelated(slug),
    hasMemberSession(),
  ]);
  const pageUrl = pageUrlOf(slug);
  return (
    <>
      <JsonLd
        data={eventJsonLd(event, {
          pageUrl,
          organizer: TEXT.vi.meta.organizer,
          siteUrl: publicEnv.siteUrl,
          imageUrl: shareImageOf(event, publicEnv.cloudinaryCloudName)?.url ?? null,
        })}
      />
      <EventDetail
        event={event}
        attendeeCount={attendeeCount}
        related={related}
        signedIn={signedIn}
        pageUrl={pageUrl}
      />
    </>
  );
}

/** `/xem-truoc/chuong-trinh/[token]`: same rendering, any status, framed by admin only. */
export async function EventPreviewPage({ token }: { token: string }) {
  const event = await getPreview(token);
  if (!event) notFound();
  const t = TEXT.vi.preview;
  return (
    <>
      <div
        role="note"
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-deep-blue px-4 py-2 text-body-sm font-semibold text-soft-white"
      >
        <FiEye aria-hidden="true" size={14} />
        {t.banner} · {t.status[event.status]}
      </div>
      <EventDetail event={event} preview pageUrl={pageUrlOf(event.slug)} />
    </>
  );
}

/**
 * `/chuong-trinh/truong-hoc` (UC-06): the school form moved here. The form itself is
 * the shared organization form of `contact`, composed by the route.
 */
export function SchoolPage({ form }: { form: ReactNode }) {
  const t = TEXT.vi.school;
  return (
    <section className="bg-soft-white pb-24 pt-dock-clearance">
      <Container className="grid gap-12 pt-10 md:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <Eyebrow className="mb-4 flex items-center gap-2">
            <PearlDot size="sm" tone="emerald" />
            {t.eyebrow}
          </Eyebrow>
          <h1 className="font-display text-4xl font-light leading-tight tracking-tight text-deep-blue md:text-6xl">
            {t.title} <em className="text-emerald-brand">{t.titleAccent}</em>
          </h1>
          <p className="mt-6 text-base leading-relaxed text-charcoal/75 md:text-lg">{t.intro}</p>
          <ul className="mt-8 space-y-3">
            {t.points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[15px] text-charcoal/85">
                <FiCheck
                  aria-hidden="true"
                  size={16}
                  className="mt-1 shrink-0 text-emerald-brand"
                />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-deep-blue p-6 shadow-hero-arch md:p-10">
          <h2 className="mb-6 font-display text-2xl text-soft-white">{t.formTitle}</h2>
          {form}
        </div>
      </Container>
    </section>
  );
}
