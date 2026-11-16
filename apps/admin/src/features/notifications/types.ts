import type { NotificationsText } from "./constants/text";

export type NotificationsFailure = keyof NotificationsText["errors"];

export type ActionResult<T = undefined> =
  | { status: "ok"; data: T }
  | { status: "invalid" }
  | { status: "error"; reason: NotificationsFailure; ref?: string };
