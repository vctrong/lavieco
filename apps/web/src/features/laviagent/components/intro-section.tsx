import Image from "next/image";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { Button, Container, Eyebrow } from "@lavieco/ui";

import { LaviAgentMascot } from "@/shared/components/illustrations/laviagent-mascot";

import { LAVIAGENT_HREF } from "../constants/config";
import { TEXT } from "../constants/text";
import type { Material } from "../types";
import { StepsStrip } from "./steps-strip";

const t = TEXT.vi;

/**
 * Landing section right after the hero: LaviAgent is the centre of the competition
 * entry, so it is seen early. Deep Blue "deep sea" chamber to stand apart from the
 * light sections around it.
 */
export function LaviAgentIntroSection({ materials }: { materials: Material[] }) {
  const [first, ...rest] = materials;
  return (
    <section
      id="laviagent"
      className="relative overflow-hidden deep-sea-pattern py-20 text-soft-white md:py-28"
    >
      <Container>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
          <div className="min-w-0">
            <Eyebrow tone="mint" className="mb-4 flex items-center gap-2">
              <span className="inline-flex rounded-full bg-canary px-1.5 text-[10px] font-bold tracking-normal text-charcoal">
                {t.aiBadge}
              </span>
              {t.intro.kicker}
            </Eyebrow>
            <h2 className="font-display text-4xl font-light leading-[1.1] tracking-tight md:text-6xl">
              {t.intro.title}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-soft-white/75 md:text-lg">
              {t.intro.lead}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <Button as={Link} href={LAVIAGENT_HREF} className="w-full sm:w-auto">
                {t.intro.cta}
                <FiArrowRight aria-hidden="true" size={16} />
              </Button>
              <p className="text-xs text-soft-white/60">{t.intro.note}</p>
            </div>
          </div>

          {/* A glimpse of the result screen: a sample photo and the mascot's answer. */}
          {first ? (
            <div className="relative mx-auto w-full max-w-sm">
              <div className="relative aspect-[4/5] overflow-hidden rounded-t-[9rem] rounded-b-[1.5rem] border border-hairline-light bg-soft-white/5">
                <Image
                  src={first.sample.image}
                  alt={first.sample.alt}
                  fill
                  sizes="(min-width: 1024px) 384px, 80vw"
                  className="object-cover"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-1/3 h-0.5 bg-emerald-brand shadow-neon-emerald"
                />
              </div>
              <div className="absolute -bottom-6 -left-4 flex max-w-[16rem] items-start gap-2.5 rounded-3xl rounded-bl-md bg-soft-white p-3 text-sm text-deep-blue shadow-phone sm:-left-10">
                <LaviAgentMascot className="size-8" />
                <p className="leading-snug">{t.intro.bubble}</p>
              </div>
              <ul
                aria-hidden="true"
                className="absolute -right-3 top-8 hidden flex-col gap-2 sm:flex"
              >
                {rest.slice(0, 3).map((material) => (
                  <li
                    key={material.id}
                    className="rounded-full border border-hairline-light bg-deep-blue/80 px-3 py-1 text-xs text-mint-mist backdrop-blur"
                  >
                    {material.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <StepsStrip tone="dark" className="mt-20" />
      </Container>
    </section>
  );
}
