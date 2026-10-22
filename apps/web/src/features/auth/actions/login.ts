"use server";

import { identityClient } from "@/lib/services";
import { requestId } from "@/lib/request-meta";
import { setMemberSession } from "@/lib/session";

import { loginSchema } from "../schemas";
import { checkBot } from "../server/anti-bot";
import { guarded, toAuthError, toFieldErrors } from "../server/outcomes";
import type { AuthResult } from "../types";

/** Email + password sign-in of a member. Wrong email and wrong password look the same. */
export async function login(input: unknown): Promise<AuthResult> {
  const id = await requestId();
  return guarded("login", id, async () => {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) return toFieldErrors(parsed.error);
    const bot = await checkBot(input);
    if (bot === "honeypot") return { status: "error", reason: "invalid_credentials" } as const;
    if (bot === "challenge_failed") return { status: "error", reason: "bot" } as const;

    try {
      const tokens = await identityClient().memberLogin(parsed.data, id);
      await setMemberSession(tokens);
      return { status: "ok" } as const;
    } catch (error) {
      return toAuthError(error, "login", id);
    }
  });
}
