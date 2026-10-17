"use client";

import Image, { type ImageLoader, type ImageProps } from "next/image";
import { FiImage } from "react-icons/fi";

import { mediaDeliveryUrl } from "@lavieco/shared/media";

import { publicEnv } from "@/lib/env.public";

/**
 * An uploaded image (ADR-0020). The loader only ever builds URLs of the allowed named
 * transformations, so the original file is never requested. Client component: a
 * loader function cannot cross from a Server Component.
 */
const cloudinaryLoader: ImageLoader = ({ src, width }) =>
  mediaDeliveryUrl({ cloudName: publicEnv.cloudinaryCloudName, publicId: src, width });

type MediaImageProps = Omit<ImageProps, "src" | "loader"> & { publicId: string };

export function MediaImage({ publicId, alt, ...props }: MediaImageProps) {
  // Not configured on this machine (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME): show a placeholder.
  if (!publicEnv.cloudinaryCloudName) {
    return (
      <span role="img" aria-label={alt} className="flex h-full w-full items-center justify-center">
        <FiImage aria-hidden="true" size={18} />
      </span>
    );
  }
  return <Image {...props} src={publicId} alt={alt} loader={cloudinaryLoader} />;
}
