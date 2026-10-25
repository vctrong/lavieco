import Image from "next/image";
import Link from "next/link";
import { FiAlertTriangle, FiArrowLeft, FiBarChart2, FiClock, FiUsers } from "react-icons/fi";

import { Container, Eyebrow } from "@lavieco/ui";

import { materialResultsHref } from "../constants/config";
import { TEXT } from "../constants/text";
import type { Catalog, Idea } from "../types";
import { IdeaActions } from "./idea-actions";
import { IdeaChecklist } from "./idea-checklist";
import { KitCard } from "./kit-card";
import { WorkshopLink } from "./workshop-link";

const t = TEXT.vi;

/** `/laviagent/y-tuong/[id]`: the shareable guide of one idea. */
export function IdeaDetail({ idea, catalog }: { idea: Idea; catalog: Catalog }) {
  const material = catalog.materials.find((item) => item.id === idea.material);
  const kit = catalog.kits.find((item) => item.id === idea.kitId) ?? null;
  const stats = [
    { icon: FiClock, label: t.idea.duration, value: t.minutes(idea.durationMinutes) },
    { icon: FiBarChart2, label: t.idea.difficulty, value: t.difficulty[idea.difficulty] },
    { icon: FiUsers, label: t.idea.age, value: t.ageFrom(idea.ageMin) },
  ];

  return (
    <div className="bg-soft-white pb-32 pt-28 lg:pb-20 lg:pt-32">
      <Container>
        <Link
          href={materialResultsHref(idea.material)}
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-deep-blue hover:text-emerald-ink"
        >
          <FiArrowLeft aria-hidden="true" size={16} />
          {material ? `${t.idea.back} · ${material.name}` : t.idea.backHome}
        </Link>

        <header className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
          <div className="relative aspect-[4/3] overflow-hidden rounded-t-[6rem] rounded-b-[1.5rem] border border-hairline bg-mint-mist shadow-hero-arch-soft sm:rounded-t-[10rem]">
            <Image
              src={idea.coverImage}
              alt={idea.coverAlt}
              fill
              priority
              sizes="(min-width: 1024px) 560px, 92vw"
              className="object-cover"
            />
          </div>
          <div>
            <Eyebrow className="mb-3">
              {t.name} · {material?.name}
            </Eyebrow>
            <h1 className="font-display text-4xl font-light leading-[1.1] tracking-tight break-words text-deep-blue sm:text-5xl">
              {idea.title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-charcoal/75">{idea.summary}</p>
            <dl className="mt-6 grid grid-cols-3 gap-3">
              {stats.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="min-w-0 rounded-2xl bg-mint-mist p-2.5 text-center sm:p-3"
                >
                  <Icon aria-hidden="true" size={16} className="mx-auto text-emerald-ink" />
                  <dt className="mt-1.5 text-[10px] uppercase tracking-wide break-words text-charcoal/55 sm:text-[11px] sm:tracking-museum">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold break-words text-deep-blue">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
          <div className="min-w-0 space-y-12">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <IdeaChecklist
                title={t.idea.have}
                items={idea.toolsHave}
                initiallyChecked
                emptyText=""
              />
              <IdeaChecklist
                title={t.idea.need}
                items={idea.toolsNeed}
                initiallyChecked={false}
                emptyText={t.idea.needNone}
              />
            </div>

            <section>
              <h2 className="mb-6 font-display text-3xl text-deep-blue">{t.idea.stepsTitle}</h2>
              <ol className="space-y-5">
                {idea.steps.map((step, index) => (
                  <li
                    key={step.title}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 rounded-[1.5rem] border border-hairline bg-soft-white p-5"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-10 items-center justify-center rounded-full bg-emerald-brand font-display text-lg text-charcoal"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="sr-only">{t.idea.stepLabel(index + 1)}</p>
                      <h3 className="font-display text-xl text-deep-blue">{step.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-charcoal/80">
                        {step.description}
                      </p>
                      {step.image ? (
                        <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-2xl bg-mint-mist">
                          <Image
                            src={step.image}
                            alt={step.title}
                            fill
                            sizes="(min-width: 1024px) 560px, 85vw"
                            className="object-cover"
                          />
                        </div>
                      ) : null}
                      {step.safetyNote ? (
                        <p className="mt-3 flex gap-2 rounded-xl border border-canary bg-canary/10 px-3 py-2 text-xs leading-relaxed text-charcoal">
                          <FiAlertTriangle
                            aria-hidden="true"
                            size={13}
                            className="mt-0.5 shrink-0 text-deep-blue"
                          />
                          <span>
                            <span className="font-semibold">{t.idea.safety}: </span>
                            {step.safetyNote}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {material ? (
              <section className="flex gap-3 rounded-[1.5rem] border border-canary bg-canary/10 p-5">
                <FiAlertTriangle
                  aria-hidden="true"
                  size={18}
                  className="mt-0.5 shrink-0 text-deep-blue"
                />
                <div>
                  <h2 className="font-semibold text-deep-blue">{t.idea.generalSafety}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-charcoal/85">
                    {material.safetyNote}
                  </p>
                </div>
              </section>
            ) : null}

            <WorkshopLink />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {kit ? <KitCard kit={kit} /> : null}
            <p className="px-2 text-xs text-charcoal/60">{t.idea.handbook}</p>
            <IdeaActions
              catalog={catalog}
              idea={idea}
              kit={kit}
              materialName={material?.name ?? ""}
            />
          </aside>
        </div>
      </Container>
    </div>
  );
}
