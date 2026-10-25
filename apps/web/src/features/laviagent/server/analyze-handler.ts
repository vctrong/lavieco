import "server-only";

import { laviagentEnv } from "@/lib/env";

import {
  ANALYZE_IP_LIMIT,
  ANALYZE_SESSION_LIMIT,
  ANALYZE_TIMEOUT_MS,
  ANALYZE_WINDOW_MS,
  MAX_UPLOAD_BYTES,
  MIN_CONFIDENCE,
} from "../constants/config";
import type { AnalyzeResponse, ClassifyResult } from "../types";
import { sniffImageType } from "../utils/sniff-image";
import { aiProvider, isOffline } from "./ai/get-provider";
import { demoShellResult } from "./demo-shell";
import { logOutcome, logProviderError } from "./log";
import { clientIpOf, consume, isSameOrigin, readSession } from "./rate-limit";
import type { StreamOutcome } from "./stream-outcome";

const STATUS: Record<string, number> = {
  invalid_image: 400,
  too_large: 413,
  rate_limited: 429,
  timeout: 504,
  unavailable: 503,
};

function respond(body: AnalyzeResponse, setCookie: string | null = null): Response {
  const status = body.status === "error" ? (STATUS[body.reason] ?? 500) : 200;
  const headers = new Headers({ "cache-control": "no-store" });
  if (setCookie) headers.set("set-cookie", setCookie);
  return Response.json(body, { status, headers });
}

/** Low confidence is "unknown" whatever the model claims; hazards are always kept. */
export function settle(result: ClassifyResult): ClassifyResult {
  if (result.safetyFlags.hazardous || result.confidence >= MIN_CONFIDENCE) return result;
  return { ...result, material: "unknown" };
}

/**
 * `POST /api/laviagent/analyze` (multipart, field `image`). The photo lives in memory
 * for the duration of the call only: never written, logged or forwarded elsewhere.
 */
export async function handleAnalyze(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return respond({ status: "error", reason: "unavailable" });
  const startedAt = Date.now();
  const session = readSession(request);
  const ip = clientIpOf(request);
  if (
    !consume(`analyze:s:${session.id}`, ANALYZE_SESSION_LIMIT, ANALYZE_WINDOW_MS) ||
    !consume(`analyze:ip:${ip}`, ANALYZE_IP_LIMIT, ANALYZE_WINDOW_MS)
  ) {
    return respond({ status: "error", reason: "rate_limited" }, session.setCookie);
  }

  // Room for the multipart envelope around the largest accepted image.
  if (Number(request.headers.get("content-length") ?? "0") > MAX_UPLOAD_BYTES + 64 * 1024) {
    return respond({ status: "error", reason: "too_large" }, session.setCookie);
  }
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("image");
  } catch {
    return respond({ status: "error", reason: "invalid_image" }, session.setCookie);
  }
  if (!(file instanceof File)) {
    return respond({ status: "error", reason: "invalid_image" }, session.setCookie);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return respond({ status: "error", reason: "too_large" }, session.setCookie);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mediaType = sniffImageType(bytes);
  if (!mediaType) return respond({ status: "error", reason: "invalid_image" }, session.setCookie);

  // Pitch mode (independent of offline): the photo was checked, the model is not called.
  if (laviagentEnv().LAVIAGENT_DEMO_VO_SO) {
    logOutcome("analyze", { provider: "demo_vo_so", outcome: "demo_shell", totalMs: 0 });
    return respond({ status: "ok", result: demoShellResult() }, session.setCookie);
  }
  const provider = aiProvider();
  if (isOffline(provider)) return respond({ status: "offline" }, session.setCookie);

  const timeout = AbortSignal.timeout(ANALYZE_TIMEOUT_MS);
  const report = (outcome: StreamOutcome) =>
    logOutcome("analyze", {
      provider: provider.id,
      model: provider.model,
      outcome,
      totalMs: Date.now() - startedAt,
    });
  try {
    const result = await provider.classifyImage(
      { mediaType, bytes },
      { signal: AbortSignal.any([timeout, request.signal]) },
    );
    report("completed");
    return respond({ status: "ok", result: settle(result) }, session.setCookie);
  } catch (error) {
    if (timeout.aborted) {
      report("total_timeout");
      return respond({ status: "error", reason: "timeout" }, session.setCookie);
    }
    if (request.signal.aborted) {
      report("stopped");
      return respond({ status: "error", reason: "unavailable" }, session.setCookie);
    }
    logProviderError("analyze", provider, error);
    report("provider_error");
    return respond({ status: "error", reason: "unavailable" }, session.setCookie);
  }
}
