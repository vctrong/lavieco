import Link from "next/link";
import type { ReactNode } from "react";

import { PearlDot, Reveal } from "@lavieco/ui";

import { CONTACT_INFO } from "@/shared/constants/contact";

import { ROUTES, SECTION_IDS } from "../constants/config";
import { TEXT } from "../constants/text";

const LINK_TARGETS = [ROUTES.collection, ROUTES.programs] as const;

type ContactSectionProps = {
  /** Form for schools and businesses (UC-05/06), provided by the `contact` feature. */
  organizationForm: ReactNode;
  /** Form for individuals (UC-04), provided by the `gift-request` feature. */
  personalForm: ReactNode;
};

/**
 * Section #10 (Deep Sea): the "two doors" frame. `home` supplies only the
 * frame and copy; the forms belong to other features and arrive as slots (F2).
 */
export function ContactSection({ organizationForm, personalForm }: ContactSectionProps) {
  const t = TEXT.vi.contact;
  const [organization, personal] = [t.organizationDoor, t.personalDoor];

  return (
    <section
      id={SECTION_IDS.contact}
      className="deep-sea-pattern relative border-b border-hairline-light px-6 py-32 text-soft-white md:px-16 lg:px-24"
    >
      <Reveal className="mx-auto max-w-6xl">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-hairline-light bg-soft-white/10 px-4 py-1 text-xs uppercase tracking-museum text-canary">
            <PearlDot size="sm" motion="ping" />
            {t.badge}
          </div>
          <h2 className="font-display text-3xl font-light leading-tight tracking-tight text-soft-white sm:text-5xl md:text-6xl">
            {t.titleBefore}{" "}
            <span className="font-normal italic text-emerald-brand">{t.titleAccent}</span>
            {t.titleEnd}
          </h2>
          <p className="mt-4 text-sm font-light leading-relaxed text-mint-mist/80 md:text-base">
            {t.intro}
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          <div className="flex flex-col rounded-3xl border border-hairline-light bg-soft-white/10 p-8 backdrop-blur-md md:p-10 lg:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-museum text-canary">
                {organization.label}
              </span>
              <PearlDot size="md" tone="emerald-flat" />
            </div>
            <h3 className="mb-2 font-display text-2xl font-normal text-soft-white md:text-3xl">
              {organization.title}
            </h3>
            <p className="mb-8 text-xs text-mint-mist/80 md:text-sm">{organization.description}</p>
            {organizationForm}
          </div>

          <div className="flex flex-col justify-between rounded-3xl border border-hairline-light bg-gradient-to-b from-soft-white/15 to-soft-white/5 p-8 backdrop-blur-md md:p-10 lg:col-span-5">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-museum text-canary">
                  {personal.label}
                </span>
                <PearlDot size="md" />
              </div>
              <h3 className="mb-3 font-display text-2xl font-normal text-soft-white md:text-3xl">
                {personal.title}
              </h3>
              <p className="mb-6 text-xs leading-relaxed text-mint-mist/80 md:text-sm">
                {personal.description}
              </p>
              <ul className="mb-8 space-y-3">
                {personal.links.map((link, index) => (
                  <li
                    key={link.title}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-hairline-light bg-soft-white/10 p-3.5"
                  >
                    <div>
                      <span className="block text-xs font-semibold text-soft-white">
                        {link.title}
                      </span>
                      <span className="text-[11px] text-mint-mist/70">{link.description}</span>
                    </div>
                    <Link
                      href={LINK_TARGETS[index] ?? ROUTES.collection}
                      className="shrink-0 text-xs text-canary hover:underline"
                    >
                      {link.cta}
                    </Link>
                  </li>
                ))}
              </ul>
              {personalForm}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-hairline-light pt-6">
              <span className="text-xs text-mint-mist/70">
                {personal.hotlineLabel} {CONTACT_INFO.phone}
              </span>
              <a
                href={`mailto:${CONTACT_INFO.emails[1]}`}
                className="text-xs font-medium text-emerald-brand hover:underline"
              >
                {CONTACT_INFO.emails[1]}
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
