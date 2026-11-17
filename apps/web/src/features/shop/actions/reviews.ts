"use server";

import { isServiceProblem } from "@lavieco/api-clients";
import { reviewCreateRequestSchema } from "@lavieco/shared/shop";

import { requestId } from "@/lib/request-meta";
import { programClient, webLogger } from "@/lib/services";

export type ReviewResult =
  { status: "ok" } | { status: "error"; reason: "invalid" | "already" | "unavailable" };

/** A review from the order link (BR-24): pending until the team publishes it. */
export async function submitReview(input: unknown): Promise<ReviewResult> {
  const parsed = reviewCreateRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const id = await requestId();
  try {
    await programClient().createReview(parsed.data, id);
    return { status: "ok" };
  } catch (error) {
    if (isServiceProblem(error) && error.code === "review.already_reviewed") {
      return { status: "error", reason: "already" };
    }
    webLogger().warn("review failed", {
      requestId: id,
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    return { status: "error", reason: "unavailable" };
  }
}
