import "server-only";

import type { PushSettings } from "@lavieco/shared/identity";

import { readIdentity } from "./call";

/** The signed-in staff member's alert settings for `/notifications`. */
export function loadPushSettings(): Promise<PushSettings> {
  return readIdentity("/notifications", (identity, token, id) =>
    identity.getPushSettings(token, id),
  );
}
