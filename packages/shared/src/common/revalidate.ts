import { z } from "zod";

/**
 * Contract of `POST /api/revalidate` on `web` (CLAUDE §8): a service asks the site to
 * drop cached pages. Signed with HMAC-SHA256 over `<timestamp>.<raw body>` using the
 * shared `REVALIDATE_SECRET`; requests older than the tolerance are refused.
 */
export const revalidateRequestSchema = z.object({
  tags: z.array(z.string().min(1).max(200)).min(1).max(20),
});
export type RevalidateRequest = z.infer<typeof revalidateRequestSchema>;

export const REVALIDATE_HEADERS = {
  timestamp: "x-lavieco-timestamp",
  signature: "x-lavieco-signature",
} as const;

export const REVALIDATE_TOLERANCE_SECONDS = 300;
