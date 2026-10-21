"use client";

import { FiStar } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { MEDIA_DELIVERY_READY, MediaImage } from "@/shared/components/media-image";

import { TEXT } from "../constants/text";
import type { SignedInViewer } from "../types";
import { initialsOf } from "../utils/initials";

const SIZES = {
  sm: { box: "size-8 text-xs", px: "32px" },
  md: { box: "size-10 text-sm", px: "40px" },
} as const;

type UserAvatarProps = {
  viewer: SignedInViewer;
  size?: keyof typeof SIZES;
  /** Emerald ring of the bar's trigger (design frame 2). */
  ringed?: boolean;
  className?: string;
};

/** Google/uploaded photo when there is one, the initials otherwise. Decorative: callers label it. */
export function UserAvatar({ viewer, size = "sm", ringed = false, className }: UserAvatarProps) {
  const { box, px } = SIZES[size];
  const isAdmin = viewer.kind === "admin";
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 rounded-full",
        ringed && "ring-2 ring-emerald-brand ring-offset-2 ring-offset-soft-white",
        className,
      )}
    >
      <span
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full font-display font-semibold",
          isAdmin ? "bg-deep-blue text-canary" : "bg-deep-blue text-soft-white",
          box,
        )}
      >
        {viewer.avatarPublicId && MEDIA_DELIVERY_READY ? (
          <MediaImage
            publicId={viewer.avatarPublicId}
            alt={TEXT.vi.account.avatarAlt}
            fill
            sizes={px}
            className="object-cover"
          />
        ) : (
          <span aria-hidden="true">{initialsOf(viewer.displayName)}</span>
        )}
      </span>
      {isAdmin ? (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full border border-soft-white bg-canary text-deep-blue"
        >
          <FiStar size={8} />
        </span>
      ) : null}
    </span>
  );
}
