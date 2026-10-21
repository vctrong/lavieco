import { z } from "zod";

const signedInFields = {
  displayName: z.string().min(1).max(200),
  email: z.string().max(320),
  /** Cloudinary public id of the avatar (ADR-0020), rendered through named transformations. */
  avatarPublicId: z.string().max(512).nullable(),
};

/**
 * Answer of `GET /api/account/viewer`: only what the navigation shows. No token, no
 * internal user id. `needs_refresh` = the access token expired but a refresh token is left.
 */
export const viewerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("guest") }),
  z.object({ kind: z.literal("needs_refresh") }),
  z.object({ kind: z.literal("member"), ...signedInFields }),
  z.object({ kind: z.literal("admin"), ...signedInFields, adminUrl: z.url() }),
]);
export type Viewer = z.infer<typeof viewerSchema>;
