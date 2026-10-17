import type { ReactNode } from "react";
import { FiCheck } from "react-icons/fi";

import { ArchFrame, Container, Eyebrow, PearlDot } from "@lavieco/ui";

import { TEXT } from "../constants/text";

type AuthShellProps = {
  title: { lead: string; emphasis: string };
  intro: string;
  children: ReactNode;
};

/**
 * Frame of the account pages: the form card on the left, an arch panel explaining
 * what an account adds on the right (stacked on phones, form first).
 */
export function AuthShell({ title, intro, children }: AuthShellProps) {
  const t = TEXT.vi.shell;
  return (
    <section className="ripple-dots relative bg-soft-white pt-dock-clearance pb-20 md:pb-28">
      <Container className="grid items-start gap-10 pt-8 md:pt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
        <div className="max-w-xl">
          <Eyebrow className="mb-4 flex items-center gap-2">
            <PearlDot size="sm" tone="emerald" />
            {t.eyebrow}
          </Eyebrow>
          <h1 className="font-display text-4xl leading-tight text-deep-blue md:text-5xl">
            {title.lead}
            <em className="text-emerald-brand">{title.emphasis}</em>
          </h1>
          <p className="mt-4 mb-8 text-[15px] leading-relaxed text-charcoal/75">{intro}</p>
          <div className="rounded-3xl border border-hairline bg-white p-6 shadow-ambient md:p-8">
            {children}
          </div>
        </div>

        <aside aria-label={t.asideEyebrow} className="lg:pt-16">
          <ArchFrame
            radius="arch"
            className="deep-sea-pattern px-8 pt-20 pb-10 text-soft-white md:px-12"
          >
            <Eyebrow tone="canary" className="mb-3">
              {t.asideEyebrow}
            </Eyebrow>
            <p className="mb-8 font-display text-3xl leading-snug">
              {t.asideTitle.lead}
              <em className="text-emerald-brand">{t.asideTitle.emphasis}</em>
            </p>
            <ul className="space-y-4">
              {t.benefits.map((benefit) => (
                <li key={benefit} className="flex gap-3 text-sm leading-relaxed text-mint-mist/90">
                  <FiCheck
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-emerald-brand"
                    size={16}
                  />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 border-t border-hairline-light pt-6 text-xs leading-relaxed text-mint-mist/70">
              {t.asideNote}
            </p>
          </ArchFrame>
        </aside>
      </Container>
    </section>
  );
}
