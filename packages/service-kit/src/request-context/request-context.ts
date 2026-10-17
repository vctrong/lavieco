import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

type RequestContext = { requestId: string };

const storage = new AsyncLocalStorage<RequestContext>();
const VALID_ID = /^[A-Za-z0-9._-]{8,128}$/;

export const REQUEST_ID_HEADER = "x-request-id";

/** The `x-request-id` of the request being handled, if any (docs/02 §6.1). */
export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/**
 * Accepts the caller's `x-request-id` when well-formed (generated at the edge and
 * propagated by the BFF), otherwise creates one; echoes it on the response.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header(REQUEST_ID_HEADER);
  const requestId = incoming && VALID_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, requestId);
  storage.run({ requestId }, () => next());
}
