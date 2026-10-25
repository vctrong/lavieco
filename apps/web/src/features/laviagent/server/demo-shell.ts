import type { ClassifyResult } from "../types";

/**
 * LAVIAGENT_DEMO_VO_SO (docs/07 §4.4): while pitching, every photo "is" a seashell so
 * the demo always flows. A believable, fixed result; ideas, KIT and safety then come
 * from the shell entries of the demo data like any real result.
 */
export function demoShellResult(): ClassifyResult {
  return {
    material: "shell",
    shape: "Vỏ sò hai mảnh, cỡ 4–6 cm",
    condition: "Vỏ sò nguyên vẹn, đã làm sạch",
    confidence: 0.96,
    safetyFlags: { hazardous: false, hazardKind: "none", sharpEdges: true },
  };
}
