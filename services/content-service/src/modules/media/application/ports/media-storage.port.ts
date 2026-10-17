export const MEDIA_STORAGE = Symbol("MEDIA_STORAGE");

/**
 * Where image files live (ADR-0020: Cloudinary, private delivery type). Only ever
 * receives cleaned bytes. Swapping providers means another implementation of this
 * port, nothing else.
 */
export interface MediaStorage {
  /** Stores the file under `publicId` (never overwrites). Throws when the provider fails. */
  upload(input: { publicId: string; bytes: Uint8Array }): Promise<void>;
  /** Removes the file; a file that is already gone counts as done. */
  destroy(publicId: string): Promise<void>;
}

/** Thrown by implementations when the provider cannot be reached or refuses. */
export class MediaStorageError extends Error {
  override name = "MediaStorageError";
}
