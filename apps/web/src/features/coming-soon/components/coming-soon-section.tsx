import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { Button, Container, PearlDot } from "@lavieco/ui";

import {
  COMING_SOON_PAGES,
  HOME_HREF,
  SUGGESTION_HREFS,
  type ComingSoonPageKey,
} from "../constants/pages";
import { TEXT } from "../constants/text";
import { WaitlistForm } from "./waitlist-form";

/**
 * A page linked from the site that is not built yet, inside the regular chrome
 * ("Calm Gallery": Soft White, Fraunces title, quiet hairlines). Its title and line come
 * from `TEXT.vi.pages`, its buttons and waitlist from `COMING_SOON_PAGES`.
 */
export function ComingSoonSection({ page }: { page: ComingSoonPageKey }) {
  const t = TEXT.vi;
  const config = COMING_SOON_PAGES[page];
  const copy = t.pages[page];
  return (
    <section className="ripple-dots bg-soft-white">
      <Container className="flex min-h-[72dvh] flex-col items-center justify-center pt-36 pb-20 text-center md:pt-44 md:pb-28">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-museum text-emerald-ink uppercase">
          <PearlDot size="sm" />
          {t.section.eyebrow}
        </p>
        <h1 className="mt-5 font-display text-display-hero-mobile text-deep-blue md:text-display-hero">
          {copy.title}
        </h1>
        <p className="mt-6 max-w-xl text-body-lg text-balance text-charcoal/80">
          {copy.description}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button as={Link} href={HOME_HREF}>
            {t.section.home}
          </Button>
          <Button as={Link} href={SUGGESTION_HREFS[config.suggestion]} variant="secondary">
            {t.suggestions[config.suggestion]}
            <FiArrowRight
              aria-hidden="true"
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </Button>
        </div>
        {config.waitlist ? (
          <div className="mt-16 flex w-full max-w-md flex-col items-center border-t border-hairline pt-10">
            <h2 className="mb-6 font-display text-title-editorial text-deep-blue">
              {t.section.waitlistTitle}
            </h2>
            <WaitlistForm />
          </div>
        ) : null}
      </Container>
    </section>
  );
}
