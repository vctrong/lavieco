"use server";

import { requestId } from "@/lib/request-meta";
import { identityClient } from "@/lib/services";
import { readPendingMfa, setPendingMfa, setStaffSession } from "@/lib/session";

import { secondFactorSchema, staffLoginSchema } from "../schemas";
import { toFailure, toFieldErrors } from "../server/outcomes";
import type { StaffAuthResult } from "../types";

/** Step 1: password. The second-factor token is kept in a 5-minute httpOnly cookie. */
export async function staffLogin(input: unknown): Promise<StaffAuthResult> {
  const parsed = staffLoginSchema.safeParse(input);
  if (!parsed.success) return toFieldErrors(parsed.error);
  try {
    const step = await identityClient().staffLogin(parsed.data, await requestId());
    await setPendingMfa(step.mfaToken, step.mfaTokenExpiresAt);
    return { status: "ok" };
  } catch (error) {
    return toFailure(error, "staff.login");
  }
}

/** Step 2: TOTP or recovery code; opens the staff session (2FA is mandatory, docs/02 §9.2). */
export async function staffVerifySecondFactor(input: unknown): Promise<StaffAuthResult> {
  const parsed = secondFactorSchema.safeParse(input);
  if (!parsed.success) return toFieldErrors(parsed.error);
  const mfaToken = await readPendingMfa();
  if (!mfaToken) return { status: "error", reason: "mfa_expired" };
  try {
    const tokens = await identityClient().staffVerifyMfa(
      { mfaToken, code: parsed.data.code },
      await requestId(),
    );
    await setStaffSession(tokens);
    return { status: "ok" };
  } catch (error) {
    return toFailure(error, "staff.second_factor");
  }
}
