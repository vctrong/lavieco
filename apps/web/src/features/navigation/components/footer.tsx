import Link from "next/link";
import { FiClock, FiMail, FiMapPin, FiPhone } from "react-icons/fi";

import { Eyebrow, PearlDot } from "@lavieco/ui";

import { CONTACT_INFO } from "@/shared/constants/contact";

import { FOOTER_LINKS, SOCIAL_LINKS } from "../constants/config";
import { TEXT } from "../constants/text";
import { BrandLogo } from "./brand-logo";

const SOCIAL_LINK_CLASS =
  "rounded-full border border-hairline px-3.5 py-1.5 text-[11px] font-medium text-deep-blue transition-colors hover:border-deep-blue";

export function Footer() {
  const t = TEXT.vi.footer;
  return (
    <footer className="relative overflow-hidden border-t border-hairline bg-soft-white px-6 pb-12 pt-20 md:px-16 lg:px-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-12 border-b border-hairline pb-16 md:grid-cols-12">
          <div className="space-y-4 md:col-span-5">
            <div className="flex items-center gap-2">
              <BrandLogo className="h-8" />
              <PearlDot size="md" tone="canary" />
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-charcoal/80">{t.description}</p>
            <div className="pt-2">
              <Eyebrow tone="deep" className="mb-1 font-semibold text-charcoal/60">
                {t.mottoLabel}
              </Eyebrow>
              <p className="font-display text-sm italic text-deep-blue">{t.motto}</p>
            </div>
            <p className="pt-2 font-mono text-[11px] uppercase tracking-museum text-charcoal/60">
              {t.catalogueNumber}
            </p>
          </div>

          <nav
            aria-label={t.spaceTitle}
            className="space-y-2.5 text-xs text-charcoal/80 md:col-span-3"
          >
            <Eyebrow tone="deep" className="mb-4 font-bold">
              {t.spaceTitle}
            </Eyebrow>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.map((link) => (
                <li key={link.id}>
                  <Link href={link.href} className="transition-colors hover:text-emerald-brand">
                    {t.links[link.id as keyof typeof t.links]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-3 text-xs text-charcoal/80 md:col-span-4">
            <Eyebrow tone="deep" className="mb-4 font-bold">
              {t.coordinatesTitle}
            </Eyebrow>
            <p className="flex items-start gap-2.5">
              <FiMapPin
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-emerald-brand"
                size={14}
              />
              <span>{t.address}</span>
            </p>
            <p className="flex items-start gap-2.5">
              <FiMail aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-brand" size={14} />
              <span>
                {CONTACT_INFO.emails.map((email) => (
                  <span key={email} className="block">
                    <a href={`mailto:${email}`} className="hover:text-emerald-brand">
                      {email}
                    </a>
                  </span>
                ))}
              </span>
            </p>
            <p className="flex items-start gap-2.5">
              <FiPhone
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-emerald-brand"
                size={14}
              />
              <a
                href={`tel:${CONTACT_INFO.phone.replace(/[^+\d]/g, "")}`}
                className="hover:text-emerald-brand"
              >
                {CONTACT_INFO.phone}
              </a>
            </p>
            <p className="flex items-start gap-2.5">
              <FiClock
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-emerald-brand"
                size={14}
              />
              <span>{t.hours}</span>
            </p>
            <div className="flex items-center gap-4 pt-3">
              <span className="sr-only">{t.connectTitle}</span>
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noreferrer"
                className={SOCIAL_LINK_CLASS}
              >
                {t.facebook}
              </a>
              <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noreferrer"
                className={SOCIAL_LINK_CLASS}
              >
                {t.tiktok}
              </a>
              <PearlDot size="sm" tone="canary-flat" />
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="relative my-8 h-px w-full overflow-hidden bg-emerald-brand/30"
        >
          <div className="absolute inset-0 animate-pulse bg-emerald-brand" />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none -mb-8 select-none overflow-hidden text-center"
        >
          <div className="font-display text-[96px] font-black leading-none tracking-tight text-deep-blue/[0.06] sm:text-[140px] md:text-[190px] lg:text-[230px]">
            {t.wordmark}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 pt-4 text-[11px] text-charcoal/60 sm:flex-row">
          <p>{t.copyright}</p>
          <p>{t.credit}</p>
        </div>
      </div>
    </footer>
  );
}
