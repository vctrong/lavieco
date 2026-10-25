import Image from "next/image";

import { cn } from "@lavieco/ui";

import type { Material } from "../types";

type SampleGalleryProps = {
  materials: Material[];
  onPick: (material: Material) => void;
  /** In a half-width panel: three columns at most. */
  compact?: boolean;
  className?: string;
};

/** "Thử với ảnh mẫu": one photo per material, a fixed answer and no API call. */
export function SampleGallery({
  materials,
  onPick,
  compact = false,
  className,
}: SampleGalleryProps) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3",
        compact ? "" : "lg:grid-cols-5",
        className,
      )}
    >
      {materials.map((material) => (
        <li key={material.id} className="min-w-0">
          <button type="button" onClick={() => onPick(material)} className="group w-full text-left">
            <span className="relative block aspect-[3/4] overflow-hidden rounded-t-[3rem] rounded-b-2xl border border-hairline bg-mint-mist">
              <Image
                src={material.sample.image}
                alt={material.sample.alt}
                fill
                sizes="(min-width: 1024px) 160px, (min-width: 640px) 30vw, 45vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </span>
            <span className="mt-2 block text-center text-xs font-medium text-deep-blue group-hover:text-emerald-ink">
              {material.name}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
