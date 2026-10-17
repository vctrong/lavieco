import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  /** Cloudinary cloud name (ADR-0020): part of every image URL, not a secret. */
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z
    .string()
    .regex(/^[a-z0-9_-]*$/i)
    .default(""),
});

// Next.js inlines NEXT_PUBLIC_* only for literal `process.env.NAME` references.
const parsed = publicEnvSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
});

export const publicEnv = {
  siteUrl: parsed.NEXT_PUBLIC_SITE_URL,
  cloudinaryCloudName: parsed.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
} as const;
