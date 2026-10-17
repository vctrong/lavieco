import type { ReactNode } from "react";

import { Eyebrow } from "@lavieco/ui";

type PageHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  intro?: string;
  actions?: ReactNode;
  back?: ReactNode;
};

/** Title block shared by the events screens (layout from docs/design/admin-chuong-trinh). */
export function PageHeader({ eyebrow, title, intro, actions, back }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        {back ? <div className="mb-4">{back}</div> : null}
        <Eyebrow className="mb-3">{eyebrow}</Eyebrow>
        <h1 className="font-display text-3xl leading-tight text-deep-blue md:text-4xl">{title}</h1>
        {intro ? (
          <p className="mt-3 text-[14.5px] leading-relaxed text-charcoal/75">{intro}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
