import { FiCamera, FiCpu, FiPackage, FiSliders } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";

const ICONS = [FiCamera, FiCpu, FiSliders, FiPackage] as const;

/** The four steps, horizontal scroll on phones, four columns from `md`. */
export function StepsStrip({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <ol
      className={cn(
        "-mx-6 flex snap-x gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0",
        className,
      )}
    >
      {TEXT.vi.steps.map((step, index) => {
        const Icon = ICONS[index] ?? FiCamera;
        return (
          <li
            key={step.title}
            className={cn(
              "w-[15.5rem] shrink-0 snap-start rounded-3xl border p-5 md:w-auto",
              dark ? "border-hairline-light bg-soft-white/5" : "border-hairline bg-soft-white",
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <span
                className={cn("font-display text-sm", dark ? "text-canary" : "text-emerald-ink")}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <Icon
                aria-hidden="true"
                size={18}
                className={dark ? "text-mint-mist" : "text-deep-blue"}
              />
            </div>
            <p className={cn("font-display text-lg", dark ? "text-soft-white" : "text-deep-blue")}>
              {step.title}
            </p>
            <p
              className={cn(
                "mt-1 text-sm leading-relaxed",
                dark ? "text-soft-white/70" : "text-charcoal/70",
              )}
            >
              {step.body}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
