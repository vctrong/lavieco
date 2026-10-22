import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { Button, Container } from "@lavieco/ui";

import { HOME_HREF, SUGGESTED_LINKS } from "../constants/config";
import { TEXT } from "../constants/text";

/**
 * 404 in the "Calm Gallery" language of the coming-soon pages: Soft White, a large
 * pale Fraunces numeral, a calm line, the way home and a few pages to visit. Rendered
 * inside the site chrome (`app/(site)/not-found.tsx`) and alone at the root.
 */
export function NotFoundPage() {
  const t = TEXT.vi;
  return (
    <section className="ripple-dots relative isolate overflow-hidden bg-soft-white">
      <Container className="flex min-h-[72dvh] flex-col items-center justify-center pt-32 pb-20 text-center md:pt-40 md:pb-28">
        <p
          aria-hidden="true"
          className="font-display text-[clamp(7rem,28vw,13rem)] leading-none font-light tracking-tighter text-deep-blue/10 select-none"
        >
          {t.numeral}
        </p>
        <p className="mt-2 text-xs font-semibold tracking-museum text-emerald-ink uppercase">
          {t.eyebrow}
        </p>
        <h1 className="mt-4 font-display text-headline-lg-mobile text-deep-blue md:text-headline-lg">
          {t.title}
        </h1>
        <p className="mt-5 max-w-xl text-body-lg text-balance text-charcoal/80">{t.subtitle}</p>
        <Button as={Link} href={HOME_HREF} className="mt-10">
          {t.homeLabel}
          <FiArrowRight
            aria-hidden="true"
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
          />
        </Button>
        <nav aria-label={t.suggestionsLabel} className="mt-10">
          <p className="text-xs tracking-museum text-charcoal/70 uppercase">{t.suggestionsLabel}</p>
          <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
            {SUGGESTED_LINKS.map((link) => (
              <li key={link.id}>
                <Link
                  href={link.href}
                  className="inline-flex rounded-full border border-hairline bg-white px-4 py-2 text-sm font-medium text-deep-blue transition-colors hover:border-emerald-brand hover:text-emerald-ink"
                >
                  {t.links[link.id]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </section>
  );
}
