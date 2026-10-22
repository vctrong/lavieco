import "server-only";

import { isServiceProblem } from "@lavieco/api-clients";
import { normalizeEmail } from "@lavieco/shared";
import type { OrderView, PublicEventDetail } from "@lavieco/shared/events";

import { requestId } from "@/lib/request-meta";
import { identityClient, programClient } from "@/lib/services";
import { readMemberSession } from "@/lib/session";

import { orderTokenSchema } from "../schemas";

const notFound = (error: unknown) =>
  isServiceProblem(error) && (error.status === 404 || error.status === 400);

/**
 * The event as the checkout needs it: fresh, not cached, so the registration status
 * and seat counts are current. `null` for an unknown or unpublished slug.
 */
export async function getCheckoutEvent(slug: string): Promise<PublicEventDetail | null> {
  try {
    return await programClient().getPublishedEvent(slug, await requestId());
  } catch (error) {
    if (notFound(error)) return null;
    throw error;
  }
}

/** The order behind a signed link, or `null` for anything that is not one of ours. */
export async function getOrder(token: string): Promise<OrderView | null> {
  if (!orderTokenSchema.safeParse(token).success) return null;
  try {
    return await programClient().getOrderByLink(token, await requestId());
  } catch (error) {
    if (notFound(error)) return null;
    throw error;
  }
}

/**
 * The signed-in member whose email is verified (they may skip the checkout OTP when
 * booking with that email, docs/05 §2). `null` for guests or on any doubt.
 */
export async function verifiedMember(): Promise<{ email: string; displayName: string } | null> {
  const { accessToken } = await readMemberSession();
  if (!accessToken) return null;
  try {
    const profile = await identityClient().getMemberProfile(accessToken, await requestId());
    return profile.emailVerifiedAt
      ? { email: profile.email, displayName: profile.displayName }
      : null;
  } catch {
    return null;
  }
}

/** Proof of the member's own verified email for `email`, or null (then OTP applies). */
export async function memberProofFor(
  email: string,
  requestIdValue?: string,
): Promise<string | null> {
  const { accessToken } = await readMemberSession();
  if (!accessToken) return null;
  try {
    const identity = identityClient();
    const id = requestIdValue ?? (await requestId());
    const profile = await identity.getMemberProfile(accessToken, id);
    if (!profile.emailVerifiedAt || normalizeEmail(profile.email) !== normalizeEmail(email)) {
      return null;
    }
    return (await identity.memberEmailProof(accessToken, id)).verificationToken;
  } catch {
    return null;
  }
}
