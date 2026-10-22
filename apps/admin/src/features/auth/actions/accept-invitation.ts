"use server";

import { requestId } from "@/lib/request-meta";
import { identityClient } from "@/lib/services";

import { acceptInviteSchema } from "../schemas";
import { guarded, toFailure, toFieldErrors } from "../server/outcomes";
import type { StaffAuthResult } from "../types";

/** Activates an invited account: password + first TOTP code. Returns the recovery codes once. */
export async function acceptInvitation(
  input: unknown,
): Promise<StaffAuthResult<{ recoveryCodes: string[] }>> {
  const id = await requestId();
  return guarded("invitation.accept", id, async () => {
    const parsed = acceptInviteSchema.safeParse(input);
    if (!parsed.success) return toFieldErrors(parsed.error);
    try {
      const { recoveryCodes } = await identityClient().acceptInvitation(parsed.data, id);
      return { status: "ok", recoveryCodes } as const;
    } catch (error) {
      return toFailure(error, "invitation.accept", id);
    }
  });
}
