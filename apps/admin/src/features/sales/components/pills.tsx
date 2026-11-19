import { FiAlertCircle, FiClock } from "react-icons/fi";

import type { SalesOrder, SalesOrderStatus, SalesPaymentStatus } from "@lavieco/shared/sales";
import { cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import { shortDay } from "../utils/format";

const t = TEXT.vi;

export const STATUS_STYLE: Record<SalesOrderStatus, string> = {
  new: "bg-canary/40 text-charcoal",
  in_progress: "bg-deep-blue/10 text-deep-blue",
  shipping: "bg-deep-blue/10 text-deep-blue",
  completed: "bg-mint-mist text-emerald-ink",
  cancelled: "bg-charcoal/8 text-charcoal/70",
};

export const PAYMENT_STYLE: Record<SalesPaymentStatus, string> = {
  unpaid: "text-error",
  deposit_paid: "text-charcoal/80",
  paid: "text-emerald-ink",
};

export function StatusPill({ status }: { status: SalesOrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold whitespace-nowrap",
        STATUS_STYLE[status],
      )}
    >
      {t.labels.status[status]}
    </span>
  );
}

export function PaymentLabel({ status }: { status: SalesPaymentStatus }) {
  return (
    <span className={cn("text-[13px] font-medium whitespace-nowrap", PAYMENT_STYLE[status])}>
      {t.labels.payment[status]}
    </span>
  );
}

/**
 * Due day: red with an icon when late, Canary (the warning token) when due today. The
 * word is always there too: colour is never the only signal.
 */
export function DueLabel({ order }: { order: Pick<SalesOrder, "dueDay" | "dueState"> }) {
  if (!order.dueDay) return <span className="text-[13px] text-charcoal/50">{t.list.noDue}</span>;
  if (order.dueState === "overdue")
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold whitespace-nowrap text-error">
        <FiAlertCircle aria-hidden="true" />
        {shortDay(order.dueDay)} · {t.list.overdue}
      </span>
    );
  if (order.dueState === "today")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-canary/50 px-2 text-[13px] font-semibold whitespace-nowrap text-charcoal">
        <FiClock aria-hidden="true" />
        {t.list.dueToday}
      </span>
    );
  return (
    <span className="text-[13px] whitespace-nowrap text-charcoal/80">{shortDay(order.dueDay)}</span>
  );
}
