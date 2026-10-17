import { v2 as cloudinary, type UploadApiOptions } from "cloudinary";

import { MediaStorageError, type MediaStorage } from "../application/ports/media-storage.port";

export type CloudinaryCredentials = { cloudName: string; apiKey: string; apiSecret: string };

/**
 * `MediaStorage` on Cloudinary (ADR-0020). Every call is signed with the API secret,
 * server side; there is no unsigned preset. Assets are `private`: the original is never
 * delivered, only the named transformations allowed under "Strict transformations".
 * The SDK keeps its configuration globally; this service talks to one account only.
 */
export class CloudinaryMediaStorage implements MediaStorage {
  constructor(credentials: CloudinaryCredentials) {
    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
      secure: true,
    });
  }

  async upload({ publicId, bytes }: { publicId: string; bytes: Uint8Array }) {
    const options: UploadApiOptions = {
      public_id: publicId,
      type: "private",
      resource_type: "image",
      overwrite: false,
      unique_filename: false,
      use_filename: false,
    };
    await new Promise<void>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (error) => {
        // The SDK error may echo request details; keep only a code-like name.
        if (error) reject(new MediaStorageError(`upload failed (${error.http_code ?? "?"})`));
        else resolve();
      });
      stream.end(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    });
  }

  async destroy(publicId: string) {
    let result: unknown;
    try {
      result = await cloudinary.uploader.destroy(publicId, {
        type: "private",
        resource_type: "image",
        invalidate: true,
      });
    } catch {
      throw new MediaStorageError("destroy failed");
    }
    const outcome = (result as { result?: string } | null)?.result;
    // "not found" = already gone (retried job, or never uploaded): that is done too.
    if (outcome !== "ok" && outcome !== "not found") {
      throw new MediaStorageError("destroy refused");
    }
  }
}
