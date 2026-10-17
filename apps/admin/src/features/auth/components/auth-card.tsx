import type { ReactNode } from "react";

import { Eyebrow, PearlDot } from "@lavieco/ui";

import { TEXT } from "../constants/text";

/** Centered card on the ripple background used by every sign-in step. */
export function AuthCard({
  title,
  intro,
  children,
  wide = false,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="ripple-dots flex min-h-dvh items-center justify-center px-4 py-12">
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-3xl border border-hairline bg-white p-6 shadow-ambient md:p-10`}
      >
        <Eyebrow className="mb-4 flex items-center gap-2">
          <PearlDot size="sm" tone="emerald" />
          {TEXT.vi.eyebrow}
        </Eyebrow>
        <h1 className="font-display text-3xl text-deep-blue">{title}</h1>
        <p className="mt-2 mb-8 text-sm leading-relaxed text-charcoal/70">{intro}</p>
        {children}
      </div>
    </main>
  );
}
