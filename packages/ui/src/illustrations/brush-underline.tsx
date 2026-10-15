import { useId } from "react";

import { cn } from "../lib/cn";

const VIEW_W = 320;
const VIEW_H = 34;
const SAMPLES = 48;
const X_START = 10;
const X_END = 312;

const xAt = (u: number) => X_START + (X_END - X_START) * u;
const fmt = (n: number) => n.toFixed(2);

/** Centre line of the brush, u ∈ [0, 1]: a shallow scallop arc rising in the middle. */
const brushCenter = (u: number) =>
  24 - 11 * Math.sin(Math.PI * u) + 1.6 * Math.sin(3 * Math.PI * u);
/** Half thickness: thick in the middle, tapering to a point at both ends. */
const brushHalf = (u: number) => 5.4 * Math.pow(Math.sin(Math.PI * u), 0.75) * (1 - 0.1 * u);
/** Thin canary hairline arched beneath the brush. */
const hairlineCenter = (u: number) => 31 - 9 * Math.sin(Math.PI * u);

function samples(from = 0, to = 1) {
  return Array.from({ length: SAMPLES + 1 }, (_, i) => from + ((to - from) * i) / SAMPLES);
}

function linePath(center: (u: number) => number, from = 0, to = 1) {
  return `M${samples(from, to)
    .map((u) => `${fmt(xAt(u))} ${fmt(center(u))}`)
    .join("L")}`;
}

/** Closed outline of the tapered stroke: along the top edge, back along the bottom. */
function outlinePath() {
  const us = samples();
  const top = us.map((u) => `${fmt(xAt(u))} ${fmt(brushCenter(u) - brushHalf(u))}`);
  const bottom = us.reverse().map((u) => `${fmt(xAt(u))} ${fmt(brushCenter(u) + brushHalf(u))}`);
  return `M${top.join("L")}L${bottom.join("L")}Z`;
}

const OUTLINE = outlinePath();
const SPINE = linePath(brushCenter);
const HAIRLINE = linePath(hairlineCenter, 0.2, 0.82);
const PEARL = { cx: xAt(1) + 4, cy: brushCenter(1) };

type BrushUnderlineProps = {
  className?: string;
};

/**
 * Hand-painted brush underline shaped like a scallop rib: an emerald stroke thick in
 * the middle and tapering to points, a canary hairline beneath it and a pearl where
 * the brush starts (right end). It paints itself in on load (~0.9s); with
 * prefers-reduced-motion the finished stroke shows at once. Decorative, so hidden
 * from assistive tech. Position and size it with `className`.
 */
export function BrushUnderline({ className }: BrushUnderlineProps) {
  const maskId = useId();

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      className={cn("pointer-events-none overflow-visible", className)}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          {/* The brush is revealed by a thick stroke drawn along its spine, right to left. */}
          <path
            d={SPINE}
            pathLength={1}
            fill="none"
            stroke="white"
            strokeWidth={18}
            strokeLinecap="round"
            strokeDasharray="1 1"
            className="animate-brush-draw-reverse motion-reduce:animate-none"
          />
        </mask>
      </defs>
      <path d={OUTLINE} mask={`url(#${maskId})`} className="fill-emerald-brand" opacity={0.9} />
      <path
        d={HAIRLINE}
        pathLength={1}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="1 1"
        className="stroke-canary animate-brush-draw-reverse [animation-delay:0.35s] motion-reduce:animate-none"
      />
      <g className="origin-center animate-pearl-pop [transform-box:fill-box] motion-reduce:animate-none">
        <circle cx={PEARL.cx} cy={PEARL.cy} r={7.5} className="fill-canary" opacity={0.3} />
        <circle cx={PEARL.cx} cy={PEARL.cy} r={4.2} className="fill-canary" />
      </g>
    </svg>
  );
}
