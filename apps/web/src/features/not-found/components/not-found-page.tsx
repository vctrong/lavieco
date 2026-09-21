import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { Button } from "@lavieco/ui";

import { TideWaves, UtilityPageShell, UtilityTitle } from "@/shared/components/utility-page";

import { TEXT } from "../constants/text";

/** 404: the page drifted out to sea, the story did not. */
export function NotFoundPage() {
  const t = TEXT.vi;
  return (
    <UtilityPageShell backdrop={{ kind: "numeral", value: "404" }} badge={t.badge}>
      <div className="relative -my-2 flex h-52 w-full max-w-md items-center justify-center md:h-64">
        <div
          aria-hidden="true"
          className="absolute size-48 rounded-full bg-emerald-brand/10 blur-3xl"
        />
        <TideWaves variant="calm" />
      </div>
      <div className="mt-2 max-w-xl space-y-4">
        <UtilityTitle lead={t.title.lead} emphasis={t.title.emphasis} />
        <p className="text-lg leading-relaxed font-light text-balance text-charcoal/80">
          {t.subtitle}
        </p>
      </div>
      <Button as={Link} href="/" className="mt-10 px-8 py-3.5">
        <span>{t.homeLabel}</span>
        <FiArrowRight
          aria-hidden="true"
          size={18}
          className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
        />
      </Button>
    </UtilityPageShell>
  );
}
