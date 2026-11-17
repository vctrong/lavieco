import type { Media } from "@lavieco/shared/media";

import type { TEXT } from "./constants/text";

export type ShopFailure = keyof typeof TEXT.vi.errors;

export type ShopActionResult<T = undefined> =
  | { status: "ok"; data: T }
  | { status: "invalid"; fieldErrors: Record<string, string> }
  | { status: "error"; reason: ShopFailure; ref?: string; blockers?: string };

export type UploadFailure = keyof typeof TEXT.vi.images.errors;

export type UploadResult =
  { status: "ok"; media: Media } | { status: "error"; reason: UploadFailure; format?: string };

/** One product image in the editor: the uploaded media and how it is shown. */
export type ProductImageValue = {
  mediaId: string;
  publicId: string;
  width: number;
  height: number;
  alt: string;
  /** `optionKey:valueKey`; empty = every variant. */
  variantValues: string[];
};
