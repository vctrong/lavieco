import type { EventStatus } from "@lavieco/shared/events";
import { cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";

const TONE: Record<EventStatus, { pill: string; dot: string }> = {
  draft: { pill: "bg-mint-mist text-deep-blue/75", dot: "bg-deep-blue/30" },
  published: { pill: "bg-emerald-brand/15 text-deep-blue", dot: "bg-emerald-brand" },
  closed: { pill: "bg-canary/35 text-deep-blue", dot: "bg-canary" },
  ended: { pill: "bg-deep-blue/10 text-deep-blue/75", dot: "bg-deep-blue/50" },
};

export function StatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
        TONE[status].pill,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", TONE[status].dot)} />
      {TEXT.vi.status[status]}
    </span>
  );
}
