import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

// Next.js inlines NEXT_PUBLIC_* only for literal `process.env.NAME` references.
const parsed = publicEnvSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

export const publicEnv = {
  siteUrl: parsed.NEXT_PUBLIC_SITE_URL,
} as const;
