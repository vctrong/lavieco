import Link from "next/link";
import type { ReactNode } from "react";
import { FiArrowLeft, FiCheck } from "react-icons/fi";

import { Container, Eyebrow, PearlDot, cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";

type CheckoutShellProps = {
  eyebrow: string;
  title: string;
  /** 0-based index of the current step, or null to hide the stepper. */
  step: number | null;
  back?: { href: string; label: string };
  children: ReactNode;
};

/** Page frame of the checkout, payment, ticket and lookup pages. */
export function CheckoutShell({ eyebrow, title, step, back, children }: CheckoutShellProps) {
  const steps = TEXT.vi.steps;
  return (
    <section className="bg-soft-white pb-24 pt-dock-clearance">
      <Container className="pt-8 md:pt-12">
        {back ? (
          <Link
            href={back.href}
            className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-deep-blue/70 hover:text-deep-blue"
          >
            <FiArrowLeft aria-hidden="true" size={14} />
            {back.label}
          </Link>
        ) : null}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow className="mb-3 flex items-center gap-2">
              <PearlDot size="sm" tone="emerald" />
              {eyebrow}
            </Eyebrow>
            <h1 className="font-display text-3xl font-light leading-tight tracking-tight text-deep-blue md:text-5xl">
              {title}
            </h1>
          </div>
          {step !== null ? (
            <ol className="flex flex-wrap items-center gap-2 text-[12.5px]">
              {steps.map((label, index) => (
                <li
                  key={label}
                  aria-current={index === step ? "step" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
                    index === step
                      ? "bg-emerald-brand font-semibold text-deep-blue"
                      : index < step
                        ? "bg-mint-mist text-deep-blue"
                        : "border border-hairline text-charcoal/60",
                  )}
                >
                  {index < step ? <FiCheck aria-hidden="true" size={12} /> : null}
                  {index + 1}. {label}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
        {children}
      </Container>
    </section>
  );
}
