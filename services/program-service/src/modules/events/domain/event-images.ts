import type { EventImage } from "@lavieco/shared/events";
import type { EventImagePurpose, MediaImageInput } from "@lavieco/shared/media";

/** What content-service knows about an uploaded image (ADR-0020). */
export type ImageFile = { publicId: string; width: number; height: number };

export type EventImages = { cover: EventImage | null; gallery: EventImage[] };

export type EventImagesInput = { cover: MediaImageInput | null; gallery: MediaImageInput[] };

export const NO_IMAGES: EventImages = { cover: null, gallery: [] };

/** Every media id an event holds, cover first. */
export function imageIds(images: EventImages): string[] {
  const ids = [
    ...(images.cover ? [images.cover.mediaId] : []),
    ...images.gallery.map((i) => i.mediaId),
  ];
  return [...new Set(ids)];
}

/** Images of the input this event does not hold yet: they must be attached first. */
export function imagesToAttach(
  current: EventImages,
  input: EventImagesInput,
): { mediaId: string; purpose: EventImagePurpose }[] {
  const held = new Set(imageIds(current));
  const wanted = [
    ...(input.cover ? [{ mediaId: input.cover.mediaId, purpose: "event_cover" as const }] : []),
    ...input.gallery.map((image) => ({
      mediaId: image.mediaId,
      purpose: "event_gallery" as const,
    })),
  ];
  const seen = new Set<string>();
  return wanted.filter((item) => {
    if (held.has(item.mediaId) || seen.has(item.mediaId)) return false;
    seen.add(item.mediaId);
    return true;
  });
}

/**
 * The snapshots to store: files of held images come from the current event, new ones
 * from content-service's attach response; alt text always from the input.
 */
export function buildImages(
  current: EventImages,
  input: EventImagesInput,
  attached: ReadonlyMap<string, ImageFile>,
): EventImages {
  const known = new Map<string, ImageFile>();
  for (const image of [current.cover, ...current.gallery]) {
    if (image) known.set(image.mediaId, image);
  }
  const snapshot = (image: MediaImageInput): EventImage => {
    const file = attached.get(image.mediaId) ?? known.get(image.mediaId);
    if (!file) throw new Error(`image ${image.mediaId} was neither held nor attached`);
    return {
      mediaId: image.mediaId,
      publicId: file.publicId,
      width: file.width,
      height: file.height,
      alt: image.alt,
    };
  };
  return {
    cover: input.cover ? snapshot(input.cover) : null,
    gallery: input.gallery.map(snapshot),
  };
}

/** Held before, gone after: content-service must release them (and delete the files). */
export function releasedImageIds(before: EventImages, after: EventImages): string[] {
  const kept = new Set(imageIds(after));
  return imageIds(before).filter((id) => !kept.has(id));
}
