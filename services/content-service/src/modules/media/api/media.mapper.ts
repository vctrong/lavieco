import type { Media } from "@lavieco/shared/media";

import type { MediaRecord } from "../domain/media";

/** Contract view: no owner, uploader, hash or lifecycle fields leave the service. */
export function toMediaDto(record: MediaRecord): Media {
  return {
    id: record.id,
    purpose: record.purpose,
    publicId: record.publicId,
    width: record.width,
    height: record.height,
    format: record.format,
    bytes: record.bytes,
  };
}
