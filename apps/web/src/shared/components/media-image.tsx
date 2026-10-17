"use client";

import Image, { type ImageLoader, type ImageProps } from "next/image";

import { mediaDeliveryUrl } from "@lavieco/shared/media";

import { publicEnv } from "@/lib/env.public";

/** False on a machine without NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: callers show their fallback. */
export const MEDIA_DELIVERY_READY = publicEnv.cloudinaryCloudName !== "";

/**
 * An uploaded image (ADR-0020). The loader only ever builds URLs of the allowed named
 * transformations (`t_lv_w<width>`), so the original file is never requested. Client
 * component: a loader function cannot cross from a Server Component.
 */
const cloudinaryLoader: ImageLoader = ({ src, width }) =>
  mediaDeliveryUrl({ cloudName: publicEnv.cloudinaryCloudName, publicId: src, width });

type MediaImageProps = Omit<ImageProps, "src" | "loader"> & { publicId: string };

export function MediaImage({ publicId, alt, ...props }: MediaImageProps) {
  return <Image {...props} src={publicId} alt={alt} loader={cloudinaryLoader} />;
}
