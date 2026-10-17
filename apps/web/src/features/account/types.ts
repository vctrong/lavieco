import type { Media } from "@lavieco/shared/media";

import type { TEXT } from "./constants/text";

export type AvatarFailure = keyof (typeof TEXT)["vi"]["avatar"]["errors"];

/** Answer of `/api/account/avatar` to the avatar picker. */
export type AvatarResult =
  | { status: "ok"; avatar: Media | null }
  | { status: "error"; reason: AvatarFailure; format?: string };
