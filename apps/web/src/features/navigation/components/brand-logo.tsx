import Image from "next/image";

import { cn } from "@lavieco/ui";

import { ASSETS } from "@/shared/constants/assets";
import { SITE_TEXT } from "@/shared/constants/text";

type BrandLogoProps = {
  className?: string;
};

/** The LAVIECO wordmark. Size it with a height class; width follows the aspect ratio. */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <Image
      src={ASSETS.logo.src}
      width={ASSETS.logo.width}
      height={ASSETS.logo.height}
      alt={SITE_TEXT.vi.siteName}
      sizes="160px"
      className={cn("h-6 w-auto", className)}
    />
  );
}
