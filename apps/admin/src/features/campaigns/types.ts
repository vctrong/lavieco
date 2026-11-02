import type { TEXT } from "./constants/text";

export type CampaignFailure = keyof typeof TEXT.vi.errors;

export type CampaignActionResult<T = undefined> =
  | { status: "ok"; data: T }
  | { status: "invalid"; fieldErrors: Record<string, string> }
  | { status: "error"; reason: CampaignFailure; ref?: string };
