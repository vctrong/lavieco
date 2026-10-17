/**
 * Upload rules of ADR-0020, shared so the admin/web pickers reject a file before it is
 * sent and the service enforces the very same numbers.
 */
export const MEDIA_PURPOSES = ["event_cover", "event_gallery", "avatar"] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

const MB = 1024 * 1024;

export const MEDIA_LIMITS = {
  /** Bytes of the uploaded file, by purpose. */
  maxBytes: { avatar: 2 * MB, event_cover: 8 * MB, event_gallery: 8 * MB },
  /** Guards against decompression bombs: 40 megapixels. */
  maxPixels: 40_000_000,
  /** Images per event gallery (docs/03 §9.2). */
  eventGalleryMax: 12,
  altMax: 200,
  /** An upload that is never attached is deleted after this long. */
  pendingTtlHours: 24,
} as const satisfies {
  maxBytes: Record<MediaPurpose, number>;
  maxPixels: number;
  eventGalleryMax: number;
  altMax: number;
  pendingTtlHours: number;
};

/** Formats accepted after the magic-byte check. */
export const MEDIA_FORMATS = ["jpeg", "png", "webp"] as const;
export type MediaFormat = (typeof MEDIA_FORMATS)[number];

/** Recognised but refused with their own message ("chọn ảnh JPG hoặc PNG"). */
export const MEDIA_REFUSED_FORMATS = ["heic", "heif", "avif"] as const;
export type MediaRefusedFormat = (typeof MEDIA_REFUSED_FORMATS)[number];

/** `accept` attribute of the file pickers. */
export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp";
