import { PearlDot, Reveal } from "@lavieco/ui";

import { TEXT } from "../constants/text";

/** Section #2: the strike-and-rewrite statement (rác → chất liệu). BR-01. */
export function Manifesto() {
  const t = TEXT.vi.manifesto;

  return (
    <section className="relative flex items-center justify-center overflow-hidden border-b border-hairline bg-soft-white px-6 py-32 text-center md:px-16 md:py-44 lg:px-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute size-[600px] rounded-full bg-mint-mist/40 blur-3xl"
      />
      <Reveal className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-8 inline-flex items-center gap-2">
          <PearlDot size="sm" />
          <span className="text-xs font-medium uppercase tracking-museum text-deep-blue/70">
            {t.tag}
          </span>
          <PearlDot size="sm" />
        </div>
        <h2 className="font-display text-3xl font-light leading-[1.3] tracking-tight text-deep-blue sm:text-4xl md:text-5xl lg:text-[54px]">
          {t.lead} <span className="font-normal">{t.emphasis}</span> {t.afterEmphasis}
          <br className="hidden sm:inline" /> {t.pursuit}{" "}
          <span className="relative mx-1.5 inline-block px-2.5">
            <del className="text-charcoal/40 decoration-charcoal/50 decoration-2">{t.struck}</del>
            <ins className="ml-2 text-4xl font-semibold italic text-emerald-brand underline decoration-canary/80 decoration-wavy sm:text-5xl lg:text-[58px]">
              {t.rewrite}
            </ins>
          </span>
          {t.end}
        </h2>
        <div className="mt-14 inline-flex items-center gap-3 rounded-full border border-hairline bg-soft-white/80 px-5 py-2 text-xs text-charcoal/75 shadow-sm">
          <PearlDot size="sm" tone="emerald-flat" />
          <span>{t.caption}</span>
        </div>
      </Reveal>
    </section>
  );
}
