import Link from "next/link";
import { FiArrowUpRight } from "react-icons/fi";

import { PearlDot, Reveal } from "@lavieco/ui";

import { ROUTES } from "../constants/config";
import { TEXT } from "../constants/text";
import { MiniQr } from "./illustrations/mini-qr";

function PhoneMockup() {
  const t = TEXT.vi.handbook.phone;
  const card = TEXT.vi.handbook.physicalCard;

  return (
    <div aria-hidden="true" className="relative w-[320px] sm:w-[340px]">
      <div className="relative rounded-[48px] border-4 border-deep-blue/40 bg-deep-blue p-4 shadow-phone">
        <div className="absolute left-1/2 top-6 z-30 h-4 w-20 -translate-x-1/2 rounded-full bg-deep-blue" />
        <div className="relative flex h-[580px] flex-col justify-between overflow-hidden rounded-[36px] border border-hairline bg-soft-white p-5">
          <div className="pt-4 text-center">
            <span className="block text-[9px] font-semibold uppercase tracking-museum text-emerald-brand">
              {t.brand}
            </span>
            <p className="mt-0.5 font-display text-sm font-semibold text-deep-blue">{t.title}</p>
            <div className="mx-auto mt-2 h-[2px] w-8 bg-canary" />
          </div>

          <div className="relative my-auto overflow-hidden rounded-2xl border border-hairline bg-mint-mist/80 p-4">
            <div className="absolute inset-x-0 top-1/2 h-1 animate-pulse bg-emerald-brand shadow-glow-emerald" />
            <div className="mb-3 flex items-center gap-3">
              <div className="size-10 rounded-lg border border-hairline bg-soft-white p-1.5 text-deep-blue">
                <MiniQr />
              </div>
              <div>
                <span className="font-mono text-[9px] uppercase text-charcoal/60">{t.itemId}</span>
                <h3 className="text-xs font-bold text-deep-blue">{t.itemName}</h3>
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-hairline bg-soft-white p-3 text-[10.5px]">
              {t.rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between text-charcoal/70">
                  <span>{row.label}</span>
                  <span
                    className={
                      row.emphasis
                        ? "font-semibold text-emerald-brand"
                        : "font-semibold text-deep-blue"
                    }
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pb-2 text-center">
            <div className="w-full rounded-full bg-emerald-brand py-2.5 text-xs font-bold text-deep-blue shadow-md">
              {t.button} →
            </div>
            <span className="mt-2 block text-[9px] text-charcoal/50">{t.copyright}</span>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-8 -z-10 hidden w-48 rotate-[-6deg] rounded-2xl border border-paper-edge bg-paper p-4 shadow-xl sm:block">
        <span className="font-mono text-[9px] text-deep-blue">{card.label}</span>
        <p className="mt-1 font-display text-xs italic text-charcoal/80">{card.quote}</p>
      </div>
    </div>
  );
}

/** Section #6: QR → digital handbook, with a phone mockup (BR-01, UC-01). */
export function HandbookPreview() {
  const t = TEXT.vi.handbook;

  return (
    <section className="relative border-b border-hairline bg-soft-white px-6 py-28 md:px-16 lg:px-24">
      <Reveal className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-hairline bg-mint-mist px-3 py-1 text-xs font-medium uppercase tracking-museum text-deep-blue">
            <PearlDot size="sm" />
            {t.badge}
          </div>
          <h2 className="mb-6 font-display text-4xl font-light tracking-tight text-deep-blue md:text-5xl lg:text-6xl">
            {t.title}
          </h2>
          <p className="mb-8 text-base font-normal leading-relaxed text-charcoal/80 md:text-lg">
            {t.introBefore}
            <span className="font-semibold text-emerald-brand">{t.introEmphasis}</span>
            {t.introAfter}
          </p>
          <ul className="space-y-4">
            {t.features.map((feature) => (
              <li key={feature.title} className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-canary/40 text-xs font-bold text-deep-blue"
                >
                  ✦
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-deep-blue">{feature.title}</h3>
                  <p className="mt-0.5 text-xs text-charcoal/70">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Link
              href={ROUTES.handbook}
              className="inline-flex items-center gap-2 rounded-full border border-hairline px-6 py-3 text-xs font-semibold uppercase tracking-museum text-deep-blue transition-all hover:border-emerald-brand hover:bg-mint-mist"
            >
              <span>{t.cta}</span>
              <FiArrowUpRight aria-hidden="true" size={14} />
            </Link>
          </div>
        </div>
        <div className="flex justify-center lg:col-span-6">
          <PhoneMockup />
        </div>
      </Reveal>
    </section>
  );
}
