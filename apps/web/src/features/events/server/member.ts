import "server-only";

import { readMemberSession } from "@/lib/session";

/**
 * Whether the visitor has a member session (the ticket box then skips the "đăng nhập
 * để điền sẵn" nudge). Presence only: nothing is trusted from it, the checkout checks
 * the session itself.
 */
export async function hasMemberSession(): Promise<boolean> {
  const { refreshToken } = await readMemberSession();
  return refreshToken !== null;
}
