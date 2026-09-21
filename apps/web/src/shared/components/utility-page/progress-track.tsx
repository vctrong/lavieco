import { cn } from "@lavieco/ui";

type ProgressTrackProps = {
  /** 0–100 */
  value: number;
  startLabel: string;
  endLabel: string;
  /** Accessible name; the bar is a milestone, not live progress. */
  label: string;
  className?: string;
};

/** Thin milestone bar: emerald fading to canary, with a start and an end label. */
export function ProgressTrack({
  value,
  startLabel,
  endLabel,
  label,
  className,
}: ProgressTrackProps) {
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="relative h-1 w-full overflow-hidden rounded-full bg-deep-blue/10"
      >
        <div
          style={{ width: `${value}%` }}
          className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-emerald-brand via-emerald-brand to-canary motion-safe:animate-pulse"
        />
      </div>
      <div className="flex justify-between px-1 text-[11px] font-medium tracking-museum text-deep-blue/80">
        <span>{startLabel}</span>
        <span className="font-semibold text-deep-blue">{endLabel}</span>
      </div>
    </div>
  );
}
