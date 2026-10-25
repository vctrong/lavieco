import { describe, expect, it } from "vitest";

import { classifyResultSchema } from "../schemas";
import { demoShellResult } from "./demo-shell";

describe("demoShellResult", () => {
  it("is a valid, confident, non-hazardous shell result", () => {
    const result = classifyResultSchema.parse(demoShellResult());
    expect(result.material).toBe("shell");
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.safetyFlags.hazardous).toBe(false);
  });
});
