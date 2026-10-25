import { cn } from "@lavieco/ui";

import { MATERIAL_ICONS } from "../constants/icons";
import type { Material, MaterialId } from "../types";

type MaterialChipsProps = {
  materials: Material[];
  onPick: (material: MaterialId) => void;
  selected?: MaterialId | null;
  /** "scroll": one swipeable row (home). "grid": wraps, bigger targets (manual picker). */
  layout?: "scroll" | "grid";
  className?: string;
};

export function MaterialChips({
  materials,
  onPick,
  selected = null,
  layout = "scroll",
  className,
}: MaterialChipsProps) {
  const grid = layout === "grid";
  return (
    <ul
      className={cn(
        grid
          ? "grid grid-cols-2 gap-3 sm:grid-cols-3"
          : "flex min-w-0 snap-x gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] sm:flex-wrap",
        className,
      )}
    >
      {materials.map((material) => {
        const Icon = MATERIAL_ICONS[material.icon];
        const active = selected === material.id;
        return (
          <li key={material.id} className={grid ? "" : "shrink-0 snap-start"}>
            <button
              type="button"
              onClick={() => onPick(material.id)}
              aria-pressed={active}
              className={cn(
                "flex w-full items-center gap-2 rounded-full border text-sm font-medium transition-colors",
                grid ? "min-h-14 px-4" : "min-h-11 px-4",
                active
                  ? "border-emerald-brand bg-emerald-brand text-charcoal"
                  : "border-hairline bg-soft-white text-deep-blue hover:border-emerald-brand hover:bg-mint-mist",
              )}
            >
              <Icon aria-hidden="true" size={16} className={active ? "" : "text-emerald-ink"} />
              <span className="whitespace-nowrap">{material.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
