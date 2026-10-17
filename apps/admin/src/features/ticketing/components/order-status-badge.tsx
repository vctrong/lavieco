import type { OrderStatus } from "@lavieco/shared/events";
import { cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";

const TONE: Record<OrderStatus, { pill: string; dot: string }> = {
  pending: { pill: "bg-canary/35 text-deep-blue", dot: "bg-canary" },
  paid: { pill: "bg-emerald-brand/15 text-deep-blue", dot: "bg-emerald-brand" },
  expired: { pill: "bg-deep-blue/10 text-deep-blue/75", dot: "bg-deep-blue/40" },
  cancelled: { pill: "bg-deep-blue/10 text-deep-blue/75", dot: "bg-deep-blue/40" },
  refunded: { pill: "bg-mint-mist text-deep-blue/80", dot: "bg-deep-blue/60" },
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
        TONE[status].pill,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", TONE[status].dot)} />
      {TEXT.vi.orderStatus[status]}
    </span>
  );
}
