import type { EventImage } from "@lavieco/shared/events";
import type { EventImagePurpose, MediaImageInput } from "@lavieco/shared/media";

/** What content-service knows about an uploaded image (ADR-0020). */
export type ImageFile = { publicId: string; width: number; height: number };

/**
 * Every image an event holds: poster (`cover`), banner, gallery and one optional
 * portrait per speaker (`avatars`, index for index with `speakers`).
 */
export type EventImages = {
  cover: EventImage | null;
  banner: EventImage | null;
  gallery: EventImage[];
  avatars: (EventImage | null)[];
};

export type EventImagesInput = {
  cover: MediaImageInput | null;
  banner: MediaImageInput | null;
  gallery: MediaImageInput[];
  avatars: (MediaImageInput | null)[];
};

export const NO_IMAGES: EventImages = { cover: null, banner: null, gallery: [], avatars: [] };

/** The images a stored event holds (portraits live on its speakers). */
export function imagesOf(event: {
  cover: EventImage | null;
  banner: EventImage | null;
  gallery: EventImage[];
  speakers: readonly { avatar: EventImage | null }[];
}): EventImages {
  return {
    cover: event.cover,
    banner: event.banner,
    gallery: event.gallery,
    avatars: event.speakers.map((speaker) => speaker.avatar),
  };
}

/** The images a create/update request asks for. */
export function imagesInputOf(input: {
  cover: MediaImageInput | null;
  banner: MediaImageInput | null;
  gallery: MediaImageInput[];
  speakers: readonly { avatar: MediaImageInput | null }[];
}): EventImagesInput {
  return {
    cover: input.cover,
    banner: input.banner,
    gallery: input.gallery,
    avatars: input.speakers.map((speaker) => speaker.avatar),
  };
}

const present = <T>(value: T | null): value is T => value !== null;

/** Every media id an event holds, cover first. */
export function imageIds(images: EventImages): string[] {
  const ids = [images.cover, images.banner, ...images.gallery, ...images.avatars]
    .filter(present)
    .map((image) => image.mediaId);
  return [...new Set(ids)];
}

/**
 * Images of the input this event does not hold yet: they must be attached first.
 * Banner and portraits are single, wide-limit event images like the poster, so they
 * use the `event_cover` purpose (no content-service change, ADR-0020).
 */
export function imagesToAttach(
  current: EventImages,
  input: EventImagesInput,
): { mediaId: string; purpose: EventImagePurpose }[] {
  const held = new Set(imageIds(current));
  const single = [input.cover, input.banner, ...input.avatars].filter(present);
  const wanted = [
    ...single.map((image) => ({ mediaId: image.mediaId, purpose: "event_cover" as const })),
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
  for (const image of [current.cover, current.banner, ...current.gallery, ...current.avatars]) {
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
    banner: input.banner ? snapshot(input.banner) : null,
    gallery: input.gallery.map(snapshot),
    avatars: input.avatars.map((avatar) => (avatar ? snapshot(avatar) : null)),
  };
}

/** Held before, gone after: content-service must release them (and delete the files). */
export function releasedImageIds(before: EventImages, after: EventImages): string[] {
  const kept = new Set(imageIds(after));
  return imageIds(before).filter((id) => !kept.has(id));
}
