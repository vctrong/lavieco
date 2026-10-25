import Image from "next/image";

import { cn } from "@lavieco/ui";

import type { Material } from "../types";

type SampleGalleryProps = {
  materials: Material[];
  onPick: (material: Material) => void;
  className?: string;
};

/** "Thử với ảnh mẫu": one photo per material, a fixed answer and no API call. */
export function SampleGallery({ materials, onPick, className }: SampleGalleryProps) {
  return (
    <ul
      className={cn(
        "-mx-6 flex snap-x gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0",
        className,
      )}
    >
      {materials.map((material) => (
        <li key={material.id} className="w-28 shrink-0 snap-start sm:w-auto">
          <button type="button" onClick={() => onPick(material)} className="group w-full text-left">
            <span className="relative block aspect-[3/4] overflow-hidden rounded-t-[3rem] rounded-b-2xl border border-hairline bg-mint-mist">
              <Image
                src={material.sample.image}
                alt={material.sample.alt}
                fill
                sizes="(min-width: 640px) 18vw, 112px"
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
