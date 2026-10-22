import { unstable_isUnrecognizedActionError } from "next/navigation";

// Browser side only (the check above is a client API): server modules import
// `form-failures` instead.

export type ThrownFailure = {
  status: "error";
  reason: "stale_version" | "offline" | "unavailable";
};

/**
 * Why calling a server action threw in the browser (actions themselves never throw):
 * the page predates a deploy or rebuild (its action ids are gone), the network is
 * down, or something else. Only the last one is "unavailable".
 */
export function failureOfThrown(error: unknown, online: boolean): ThrownFailure {
  if (unstable_isUnrecognizedActionError(error)) {
    return { status: "error", reason: "stale_version" };
  }
  // fetch() rejects with a TypeError when the request never got an answer.
  if (!online || error instanceof TypeError) return { status: "error", reason: "offline" };
  return { status: "error", reason: "unavailable" };
}

/** Calls a server action from a form; a thrown error comes back as a failure instead. */
export async function callAction<T>(action: () => Promise<T>): Promise<T | ThrownFailure> {
  try {
    return await action();
  } catch (error) {
    return failureOfThrown(error, typeof navigator === "undefined" || navigator.onLine);
  }
}
