import "server-only";

import type { ProgramClient } from "@lavieco/api-clients";

import { requestId } from "@/lib/request-meta";
import { identityClient, programClient } from "@/lib/services";
import { withStaffToken } from "@/lib/staff-token";

import type { ActionResult } from "../types";
import { toFailure } from "./outcomes";

/**
 * Runs a program-service write from a Server Action with the staff token. The service
 * checks `program:write` itself; hiding buttons in the UI is only for convenience.
 */
export async function callProgram<T>(
  context: string,
  run: (client: ProgramClient, token: string, requestId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  const id = await requestId();
  try {
    const call = await withStaffToken(id, (token) => run(programClient(), token, id));
    if (call.session === "expired") return { status: "error", reason: "session_expired" };
    return { status: "ok", data: call.value };
  } catch (error) {
    return toFailure(error, context, id);
  }
}

/**
 * Same, for a sensitive change (ADR-0021): a fresh TOTP code is exchanged for a
 * 5-minute step-up token bound to this session, then passed to program-service.
 */
export async function callProgramWithStepUp<T>(
  context: string,
  code: string,
  run: (client: ProgramClient, token: string, stepUp: string, requestId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  return callProgram(context, async (client, token, id) => {
    const { stepUpToken } = await identityClient().stepUp(token, code, id);
    return run(client, token, stepUpToken, id);
  });
}
