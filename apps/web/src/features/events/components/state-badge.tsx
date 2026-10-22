import type { PublicAvailability, PublicEventState } from "@lavieco/shared/events";
import { cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";

/** Every pair keeps WCAG AA for 11–12 px bold text (emerald text uses emerald-ink). */
const TONE: Record<PublicEventState, string> = {
  open: "bg-mint-mist text-emerald-ink",
  few_left: "bg-canary text-deep-blue",
  sold_out: "bg-deep-blue text-soft-white",
  upcoming_sale: "border border-hairline bg-white text-deep-blue",
  online_link_pending: "border border-hairline bg-white text-deep-blue",
  closed: "bg-charcoal/10 text-charcoal",
  ended: "bg-deep-blue/10 text-deep-blue",
  cancelled: "bg-charcoal text-soft-white",
};

/**
 * Badge of the state computed by program-service. "Sắp hết chỗ" says how many seats
 * are left when the service gives the number (only when few remain).
 */
export function StateBadge({
  state,
  availability,
  className,
}: {
  state: PublicEventState;
  availability?: PublicAvailability;
  className?: string;
}) {
  const t = TEXT.vi;
  const label =
    state === "few_left" && availability?.seatsLeft
      ? t.card.seatsLeft(availability.seatsLeft)
      : t.state[state];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-meta font-semibold uppercase",
        TONE[state],
        className,
      )}
    >
      {label}
    </span>
  );
}
