import { describe, expect, it } from "vitest";

import {
  centredOffset,
  clampOffset,
  cropRect,
  displayedSize,
  outputSize,
  ratioValue,
} from "./crop";

const image = { width: 2000, height: 1000 };
const frame = { width: 400, height: 500 };

describe("poster crop geometry", () => {
  it("reads the ratio as width over height", () => {
    expect(ratioValue("4:5")).toBe(0.8);
    expect(ratioValue("1:1")).toBe(1);
  });

  it("makes the photo cover the frame at zoom 1", () => {
    expect(displayedSize(image, frame, 1)).toEqual({ width: 1000, height: 500 });
  });

  it("never leaves an empty edge when dragged too far", () => {
    expect(clampOffset({ x: 50, y: 50 }, image, frame, 1)).toEqual({ x: 0, y: 0 });
    expect(clampOffset({ x: -5000, y: -5000 }, image, frame, 1)).toEqual({ x: -600, y: 0 });
  });

  it("maps the visible area back to source pixels", () => {
    expect(cropRect({ x: 0, y: 0 }, image, frame, 1)).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 1000,
    });
    const centred = centredOffset(image, frame, 1);
    expect(cropRect(centred, image, frame, 1).x).toBe(600);
    expect(cropRect({ x: 0, y: 0 }, image, frame, 2)).toMatchObject({ width: 400, height: 500 });
  });

  it("keeps the frame's ratio in the cropped rectangle", () => {
    const rect = cropRect({ x: -100, y: 0 }, image, frame, 1.5);
    expect(rect.width / rect.height).toBeCloseTo(0.8);
  });

  it("downscales large crops and never upscales small ones", () => {
    expect(outputSize({ width: 3200, height: 4000 })).toEqual({ width: 1536, height: 1920 });
    expect(outputSize({ width: 800, height: 1000 })).toEqual({ width: 800, height: 1000 });
  });
});
