import "server-only";

import type { IdentityClient, ProgramClient } from "@lavieco/api-clients";

import { requestId } from "@/lib/request-meta";
import { identityClient, programClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";

import type { ActionResult } from "../types";
import { toFailure } from "./outcomes";

type Clients = { program: ProgramClient; identity: IdentityClient };

/**
 * Runs a service call from a Server Action with the staff token. Every permission is
 * checked by the service itself; hidden buttons are only a convenience.
 */
export async function callStaff<T>(
  context: string,
  run: (clients: Clients, token: string, requestId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  const id = await requestId();
  try {
    const { accessToken } = await readStaffSession();
    if (!accessToken) return { status: "error", reason: "session_expired" };
    const clients = { program: programClient(), identity: identityClient() };
    return { status: "ok", data: await run(clients, accessToken, id) };
  } catch (error) {
    return toFailure(error, context, id);
  }
}

/** Step-up (ADR-0021): a fresh TOTP code for a 5-minute token bound to this session. */
export async function stepUpToken(
  identity: IdentityClient,
  token: string,
  code: string,
  id: string,
): Promise<string> {
  return (await identity.stepUp(token, code, id)).stepUpToken;
}
