/**
 * Delivery of uploaded images (ADR-0020). Assets are private on Cloudinary and the
 * account runs "Strict transformations": only these named transformations can be
 * served, never the original. `npm run media:setup -w @lavieco/content-service`
 * creates exactly this list, so apps and the service must agree on it.
 */
export const MEDIA_DELIVERY_WIDTHS = [96, 160, 320, 480, 640, 960, 1280, 1920] as const;
export type MediaDeliveryWidth = (typeof MEDIA_DELIVERY_WIDTHS)[number];

/** `lv_w<width>`, defined as `c_limit,w_<width>/f_auto,q_auto`. */
export function mediaTransformationName(width: MediaDeliveryWidth): string {
  return `lv_w${width}`;
}

export function mediaTransformationDefinition(width: MediaDeliveryWidth): string {
  return `c_limit,w_${width}/f_auto,q_auto`;
}

const LARGEST_WIDTH: MediaDeliveryWidth = 1920;

/** Smallest allowed width that covers the requested one (the largest if none does). */
export function deliveryWidthFor(requested: number): MediaDeliveryWidth {
  return MEDIA_DELIVERY_WIDTHS.find((width) => width >= requested) ?? LARGEST_WIDTH;
}

/** Public URL of an uploaded image at (at least) `width` pixels. */
export function mediaDeliveryUrl(input: {
  cloudName: string;
  publicId: string;
  width: number;
}): string {
  const named = mediaTransformationName(deliveryWidthFor(input.width));
  const path = input.publicId.split("/").map(encodeURIComponent).join("/");
  return `https://res.cloudinary.com/${encodeURIComponent(input.cloudName)}/image/private/t_${named}/${path}`;
}
