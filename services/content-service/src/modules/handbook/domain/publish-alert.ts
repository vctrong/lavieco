import { createHash } from "node:crypto";

import type { PushNotificationRequest } from "@lavieco/shared/identity";

import type { VersionRecord } from "./handbook";

/** Admin page opened from the alert: the version history (D1). */
export const HANDBOOK_HISTORY_PATH = "/handbook/history";

const BODY_MAX = 200;

/** Same version, same id: identity-service drops a retried alert (ADR-0027). */
export function publishAlertId(versionId: string): string {
  const hex = createHash("sha256").update(`lavieco-handbook-published:${versionId}`).digest("hex");
  const variant = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `8${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

/**
 * "<người> đã xuất bản Cẩm nang Xanh số phiên bản N — <ghi chú>" (D1). The publisher's
 * display name is the one deliberate personal detail: a staff name, shown to staff,
 * asked for by the team. Never reader or customer data.
 */
export function publishAlert(
  version: Pick<VersionRecord, "id" | "number" | "note" | "publishedBy">,
  restoredFrom: number | null,
): PushNotificationRequest {
  const who = version.publishedBy?.name || "Một thành viên";
  const what = restoredFrom
    ? `khôi phục Cẩm nang Xanh số về phiên bản ${restoredFrom} (thành phiên bản ${version.number})`
    : `xuất bản Cẩm nang Xanh số phiên bản ${version.number}`;
  const body = `${who} đã ${what} — ${version.note}`;
  return {
    notificationId: publishAlertId(version.id),
    topic: "handbook_published",
    title: `Cẩm nang Xanh số · phiên bản ${version.number}`,
    body: body.length <= BODY_MAX ? body : `${body.slice(0, BODY_MAX - 1)}…`,
    url: HANDBOOK_HISTORY_PATH,
    tag: "handbook-published",
  };
}
