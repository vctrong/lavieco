import "server-only";

import type { ProgramClient } from "@lavieco/api-clients";

import { requestId } from "@/lib/request-meta";
import { programClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";

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
  const { accessToken } = await readStaffSession();
  if (!accessToken) return { status: "error", reason: "session_expired" };
  try {
    return { status: "ok", data: await run(programClient(), accessToken, await requestId()) };
  } catch (error) {
    return toFailure(error, context);
  }
}
