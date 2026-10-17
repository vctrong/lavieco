import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FiCheck, FiEye } from "react-icons/fi";

import { Container, Eyebrow, PearlDot } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import { getEvent, getPreview } from "../server/events";
import { EventDetail } from "./event-detail";

/** `/chuong-trinh/[slug]`: published, closed or ended events only (404 otherwise). */
export async function EventDetailPage({ slug }: { slug: string }) {
  const event = await getEvent(slug);
  if (!event) notFound();
  return <EventDetail event={event} />;
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
        className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 bg-deep-blue px-4 py-2 text-[12.5px] font-semibold text-soft-white"
      >
        <FiEye aria-hidden="true" size={14} />
        {t.banner} · {t.status[event.status]}
      </div>
      <EventDetail event={event} />
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
