import type { ProductStatus } from "@lavieco/shared/shop";
import { cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";

const STYLE: Record<ProductStatus, string> = {
  draft: "bg-deep-blue/8 text-deep-blue",
  published: "bg-mint-mist text-emerald-ink",
  hidden: "bg-canary/35 text-charcoal",
  archived: "bg-charcoal/8 text-charcoal/70",
};

/** Text and colour together: the status never relies on colour alone. */
export function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
        STYLE[status],
      )}
    >
      {TEXT.vi.status[status]}
    </span>
  );
}
