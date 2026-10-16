import "server-only";

import { readPendingMfa } from "@/lib/session";

/** Whether the password step was passed in the last 5 minutes (UX only; identity re-checks). */
export async function hasPendingSecondFactor(): Promise<boolean> {
  return (await readPendingMfa()) !== null;
}
