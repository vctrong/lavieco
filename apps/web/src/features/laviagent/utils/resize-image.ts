import { MAX_SOURCE_IMAGE_BYTES, RESIZE_MAX_SIDE, RESIZE_QUALITY } from "../constants/config";

export type PreparedImage = {
  blob: Blob;
  /** Object URL for previews; revoke it when the image is dropped. */
  url: string;
};

export type PrepareFailure = "too_large" | "heic" | "invalid";

const isHeic = (file: File) => /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);

/**
 * Downscales a photo on the device before upload (~1024 px JPEG): faster on mobile
 * data, cheaper for the model, and it drops EXIF (location) since the canvas re-encodes.
 */
export async function prepareImage(file: File): Promise<PreparedImage | PrepareFailure> {
  if (file.size > MAX_SOURCE_IMAGE_BYTES) return "too_large";
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return isHeic(file) ? "heic" : "invalid";
  }
  const scale = Math.min(1, RESIZE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return "invalid";
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", RESIZE_QUALITY),
  );
  if (!blob) return "invalid";
  return { blob, url: URL.createObjectURL(blob) };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

const THUMBNAIL_MAX_SIDE = 96;
const THUMBNAIL_QUALITY = 0.7;

/**
 * The only image kept in chat history (docs/07 §4.3): ~96px JPEG data URL drawn from the
 * already resized photo, a few KB, no EXIF. Null if the browser cannot draw it.
 */
export async function makeThumbnail(blob: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, THUMBNAIL_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", THUMBNAIL_QUALITY);
  } catch {
    return null;
  }
}
