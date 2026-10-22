import Link from "next/link";

import { Button } from "@lavieco/ui";

import { TEXT } from "../constants/text";

/** Admin 404: the same calm numeral and title as the public site, without the chrome. */
export function NotFoundPage() {
  const t = TEXT.vi;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-soft-white px-6 py-16 text-center">
      <p
        aria-hidden="true"
        className="font-display text-[clamp(6rem,24vw,10rem)] leading-none font-light tracking-tighter text-deep-blue/10 select-none"
      >
        {t.numeral}
      </p>
      <h1 className="mt-4 font-display text-headline-md text-deep-blue">{t.title}</h1>
      <p className="mt-3 max-w-md text-body-md text-charcoal/75">{t.subtitle}</p>
      <Button as={Link} href="/" className="mt-8">
        {t.homeLabel}
      </Button>
    </main>
  );
}
