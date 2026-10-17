import { z } from "zod";

import { objectIdSchema } from "../common/object-id";
import { MEDIA_FORMATS, MEDIA_LIMITS, MEDIA_PURPOSES } from "./limits";

export const mediaPurposeSchema = z.enum(MEDIA_PURPOSES);
export const mediaFormatSchema = z.enum(MEDIA_FORMATS);

/** One uploaded image as returned by content-service. No alt: it belongs where it is used. */
export const mediaSchema = z.object({
  id: objectIdSchema,
  purpose: mediaPurposeSchema,
  publicId: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  format: mediaFormatSchema,
  bytes: z.number().int().positive(),
});
export type Media = z.infer<typeof mediaSchema>;

export const eventImagePurposeSchema = z.enum(["event_cover", "event_gallery"]);
export type EventImagePurpose = z.infer<typeof eventImagePurposeSchema>;

/** Multipart text field next to the `file` part of `POST /internal/v1/media/event-images`. */
export const eventImageUploadFieldsSchema = z.object({ purpose: eventImagePurposeSchema });
export type EventImageUploadFields = z.infer<typeof eventImageUploadFieldsSchema>;

/** Where an attached image is used. Only events for now (ADR-0020). */
export const mediaAttachmentRefSchema = z.object({
  kind: z.literal("event"),
  id: objectIdSchema,
});
export type MediaAttachmentRef = z.infer<typeof mediaAttachmentRefSchema>;

/** `POST /internal/v1/media/{id}/attach`, called by program-service before it saves an event. */
export const mediaAttachRequestSchema = z.object({
  purpose: eventImagePurposeSchema,
  ref: mediaAttachmentRefSchema,
});
export type MediaAttachRequest = z.infer<typeof mediaAttachRequestSchema>;

/** `POST /internal/v1/media/{id}/release`: only the current holder can release an image. */
export const mediaReleaseRequestSchema = z.object({ ref: mediaAttachmentRefSchema });
export type MediaReleaseRequest = z.infer<typeof mediaReleaseRequestSchema>;

/** `GET|PUT|DELETE /internal/v1/members/me/avatar`. */
export const memberAvatarSchema = z.object({ avatar: mediaSchema.nullable() });
export type MemberAvatar = z.infer<typeof memberAvatarSchema>;

/**
 * Snapshot of an image kept where it is used (ID + snapshot across services,
 * docs/02 §8.1): enough to render it without calling content-service.
 */
export const mediaImageSchema = z.object({
  mediaId: objectIdSchema,
  publicId: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string(),
});
export type MediaImage = z.infer<typeof mediaImageSchema>;

/** What an editor sends: the uploaded media and its alt text. The rest comes from content-service. */
export const mediaImageInputSchema = z.object({
  mediaId: objectIdSchema,
  alt: z.string().trim().min(1).max(MEDIA_LIMITS.altMax),
});
export type MediaImageInput = z.infer<typeof mediaImageInputSchema>;
