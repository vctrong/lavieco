"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ANALYZE_ENDPOINT, ANALYZE_TIMEOUT_MS } from "../constants/config";
import { analyzeResponseSchema } from "../schemas";
import type { Catalog, ClassifyResult, Material, MaterialId } from "../types";
import { prepareImage, type PrepareFailure, type PreparedImage } from "../utils/resize-image";

export type FlowImage =
  ({ kind: "upload" } & PreparedImage) | { kind: "sample"; url: string; alt: string };

export type PickReason =
  "offline" | "unknown" | "failed" | "timeout" | "network" | "rate_limited" | "correct";

export type ResultSource = "ai" | "sample" | "manual";

/** One screen at a time (docs/07 §4). Only idea details have their own URL. */
export type Flow =
  | { step: "home"; notice: PrepareFailure | null }
  | { step: "review"; image: FlowImage & { kind: "upload" } }
  | { step: "analyzing"; image: FlowImage & { kind: "upload" } }
  | { step: "pick"; reason: PickReason; image: FlowImage | null }
  | { step: "hazard"; image: FlowImage; result: ClassifyResult }
  | {
      step: "result";
      image: FlowImage | null;
      material: MaterialId;
      result: ClassifyResult | null;
      source: ResultSource;
    };

const sampleResult = (material: Material): ClassifyResult => ({
  material: material.id,
  shape: material.sample.shape,
  condition: material.sample.condition,
  confidence: material.sample.confidence,
  safetyFlags: { hazardous: false, hazardKind: "none", sharpEdges: false },
});

export function useAgentFlow(catalog: Catalog, initialMaterial: MaterialId | null) {
  const [flow, setFlow] = useState<Flow>(() =>
    initialMaterial
      ? { step: "result", image: null, material: initialMaterial, result: null, source: "manual" }
      : { step: "home", notice: null },
  );
  /** Learnt from the first answer: offline demos skip the analyzing screen afterwards. */
  const offlineRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const uploadUrlRef = useRef<string | null>(null);

  // Object URLs live as long as the screen shows them.
  const trackUpload = (url: string | null) => {
    if (uploadUrlRef.current && uploadUrlRef.current !== url) {
      URL.revokeObjectURL(uploadUrlRef.current);
    }
    uploadUrlRef.current = url;
  };
  useEffect(() => () => trackUpload(null), []);

  // Each screen starts at the top (the navbar stays put).
  const step = flow.step;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const selectFile = useCallback(async (file: File) => {
    const prepared = await prepareImage(file);
    if (typeof prepared === "string") {
      trackUpload(null);
      setFlow({ step: "home", notice: prepared });
      return;
    }
    trackUpload(prepared.url);
    setFlow({ step: "review", image: { kind: "upload", ...prepared } });
  }, []);

  const analyze = useCallback(async (image: FlowImage & { kind: "upload" }) => {
    if (offlineRef.current) {
      setFlow({ step: "pick", reason: "offline", image });
      return;
    }
    setFlow({ step: "analyzing", image });
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(() => controller.abort("timeout"), ANALYZE_TIMEOUT_MS);
    const form = new FormData();
    form.append("image", image.blob, "photo.jpg");

    let next: Flow;
    try {
      const response = await fetch(ANALYZE_ENDPOINT, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const parsed = analyzeResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        next = { step: "pick", reason: "failed", image };
      } else if (parsed.data.status === "offline") {
        offlineRef.current = true;
        next = { step: "pick", reason: "offline", image };
      } else if (parsed.data.status === "error") {
        const reason = parsed.data.reason;
        if (reason === "invalid_image" || reason === "too_large") {
          trackUpload(null);
          next = { step: "home", notice: reason === "too_large" ? "too_large" : "invalid" };
        } else {
          next = {
            step: "pick",
            reason:
              reason === "rate_limited"
                ? "rate_limited"
                : reason === "timeout"
                  ? "timeout"
                  : "failed",
            image,
          };
        }
      } else {
        const result = parsed.data.result;
        if (result.safetyFlags.hazardous) next = { step: "hazard", image, result };
        else if (result.material === "unknown") next = { step: "pick", reason: "unknown", image };
        else next = { step: "result", image, material: result.material, result, source: "ai" };
      }
    } catch {
      if (controller.signal.aborted && controller.signal.reason === "cancel") {
        next = { step: "review", image };
      } else if (controller.signal.aborted) {
        next = { step: "pick", reason: "timeout", image };
      } else {
        next = { step: "pick", reason: navigator.onLine ? "failed" : "network", image };
      }
    } finally {
      window.clearTimeout(timer);
      abortRef.current = null;
    }
    setFlow(next);
  }, []);

  const cancelAnalyze = useCallback(() => abortRef.current?.abort("cancel"), []);

  const reset = useCallback(() => {
    abortRef.current?.abort("cancel");
    trackUpload(null);
    setFlow({ step: "home", notice: null });
  }, []);

  const dismissNotice = useCallback(() => setFlow({ step: "home", notice: null }), []);

  /** "Thử với ảnh mẫu": a fixed answer, no API call (demo fallback). */
  const pickSample = useCallback((material: Material) => {
    trackUpload(null);
    setFlow({
      step: "result",
      image: { kind: "sample", url: material.sample.image, alt: material.sample.alt },
      material: material.id,
      result: sampleResult(material),
      source: "sample",
    });
  }, []);

  /** Quick chips, the manual picker and "Không đúng? Sửa lại". */
  const pickMaterial = useCallback((material: MaterialId, image: FlowImage | null = null) => {
    setFlow({ step: "result", image, material, result: null, source: "manual" });
  }, []);

  const correct = useCallback((image: FlowImage | null) => {
    setFlow({ step: "pick", reason: "correct", image });
  }, []);

  return {
    flow,
    selectFile,
    analyze,
    cancelAnalyze,
    reset,
    dismissNotice,
    pickSample,
    pickMaterial,
    correct,
    materials: catalog.materials,
  };
}
