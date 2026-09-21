import { useId } from "react";

import { cn } from "@lavieco/ui";

type TideWavesProps = {
  /** `calm` is the thin tide line of 404 / coming soon; `rough` is the swell of the 500 page. */
  variant?: "calm" | "rough";
  className?: string;
};

// Colours come from the theme tokens; SVG paint servers take them through CSS variables.
const TOKEN = {
  emerald: "var(--color-emerald-brand)",
  deep: "var(--color-deep-blue)",
  canary: "var(--color-canary)",
  light: "var(--color-pearl-light)",
  shade: "var(--color-pearl-shade)",
  white: "var(--color-soft-white)",
} as const;

type StopProps = { offset: string; color: string; opacity?: number };

function Stop({ offset, color, opacity = 1 }: StopProps) {
  return <stop offset={offset} style={{ stopColor: color, stopOpacity: opacity }} />;
}

/**
 * Decorative tide illustration with a canary pearl riding the crest. The calm variant is
 * a still hairline; the rough variant stacks taller, drifting swells and pushes the pearl
 * lower and tilted, but keeps it lit ("still here"). Hidden from assistive tech.
 */
export function TideWaves({ variant = "calm", className }: TideWavesProps) {
  const id = useId();
  const rough = variant === "rough";
  const strokeA = `${id}-stroke-a`;
  const strokeB = `${id}-stroke-b`;
  const pearl = `${id}-pearl`;
  const glow = `${id}-glow`;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 460 220"
      fill="none"
      className={cn("h-full w-full overflow-visible", className)}
    >
      <defs>
        <linearGradient id={strokeA} x1="0%" x2="100%" y1="50%" y2="50%">
          <Stop offset="0%" color={TOKEN.deep} opacity={0} />
          <Stop offset="25%" color={TOKEN.emerald} opacity={0.3} />
          <Stop offset="50%" color={TOKEN.emerald} opacity={0.85} />
          <Stop offset="75%" color={TOKEN.deep} opacity={0.35} />
          <Stop offset="100%" color={TOKEN.deep} opacity={0} />
        </linearGradient>
        <linearGradient id={strokeB} x1="100%" x2="0%" y1="50%" y2="50%">
          <Stop offset="0%" color={TOKEN.emerald} opacity={0} />
          <Stop offset="35%" color={TOKEN.deep} opacity={0.3} />
          <Stop offset="65%" color={TOKEN.emerald} opacity={0.5} />
          <Stop offset="100%" color={TOKEN.emerald} opacity={0} />
        </linearGradient>
        <radialGradient id={pearl} cx="40%" cy="38%" r="65%">
          <Stop offset="0%" color={TOKEN.light} />
          <Stop offset="45%" color={TOKEN.canary} />
          <Stop offset="100%" color={TOKEN.shade} />
        </radialGradient>
        <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {rough ? (
        <>
          <g className="motion-safe:animate-tide-drift-reverse">
            <path
              d="M 10 160 C 80 118, 140 186, 230 150 C 320 114, 380 176, 450 138"
              stroke={`url(#${strokeB})`}
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeDasharray="3 4"
              opacity="0.7"
            />
          </g>
          <g className="motion-safe:animate-tide-drift">
            <path
              d="M 0 138 C 70 84, 130 176, 230 132 C 330 88, 390 170, 460 122"
              stroke={`url(#${strokeA})`}
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.6"
            />
          </g>
          <g className="motion-safe:animate-tide-drift-reverse">
            <path
              d="M 10 118 C 80 50, 150 168, 230 110 C 310 52, 380 150, 450 96"
              stroke={`url(#${strokeA})`}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </g>
        </>
      ) : (
        <>
          <path
            d="M 30 148 C 110 148, 160 168, 230 162 C 300 156, 350 134, 430 138"
            stroke={`url(#${strokeB})`}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray="3 4"
            opacity="0.6"
          />
          <path
            d="M 50 132 C 120 110, 170 122, 230 136 C 290 150, 360 144, 410 118"
            stroke={`url(#${strokeA})`}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 20 130 C 100 80, 160 140, 230 120 C 300 100, 360 150, 440 115"
            stroke={`url(#${strokeA})`}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </>
      )}

      {/* The pearl: on the crest when calm, pushed lower and tilted when rough. */}
      <g transform={rough ? "translate(230 132) rotate(-14)" : "translate(230 108)"}>
        <g className="motion-safe:animate-pearl-bob">
          <circle
            r={rough ? 18 : 22}
            filter={`url(#${glow})`}
            style={{ fill: TOKEN.canary, fillOpacity: rough ? 0.12 : 0.18 }}
          />
          <circle r="14" style={{ fill: TOKEN.canary, fillOpacity: rough ? 0.22 : 0.32 }} />
          <circle r="8.5" fill={`url(#${pearl})`} />
          <ellipse
            cx="-2.5"
            cy="-2.5"
            rx="2"
            ry="1.2"
            transform="rotate(-30 -2.5 -2.5)"
            style={{ fill: TOKEN.white, fillOpacity: 0.85 }}
          />
        </g>
        <ellipse
          cy="12"
          rx={rough ? 20 : 16}
          ry={rough ? 4.5 : 3.5}
          style={{ stroke: TOKEN.emerald, strokeOpacity: 0.45 }}
          strokeWidth="0.75"
        />
      </g>
    </svg>
  );
}
