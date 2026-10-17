import { z } from "zod";

const publicEnvSchema = z.object({
  /** Cloudinary cloud name (ADR-0020): part of every image URL, not a secret. */
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z
    .string()
    .regex(/^[a-z0-9_-]*$/i)
    .default(""),
});

// Next.js inlines NEXT_PUBLIC_* only for literal `process.env.NAME` references.
const parsed = publicEnvSchema.parse({
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
});

export const publicEnv = {
  cloudinaryCloudName: parsed.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
} as const;
