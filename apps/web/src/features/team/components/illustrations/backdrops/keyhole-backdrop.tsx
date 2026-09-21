import { TEAM_BACKDROP_VIEWBOX, TEAM_HOVER_TIMING } from "../../../constants/config";

const RADAR = [52, 92, 132] as const;

/** Hexes lit on hover; centres sit on the pattern grid below. */
const LIT_HEXES = [
  [84, 98],
  [228, 56],
  [324, 140],
] as const;

const hexPoints = (cx: number, cy: number) =>
  `${cx},${cy - 14} ${cx + 12},${cy - 7} ${cx + 12},${cy + 7} ${cx},${cy + 14} ${cx - 12},${cy + 7} ${cx - 12},${cy - 7}`;

/** 06 · Phụng: a keyhole behind the back, radar rings and a fine hexagon grid. */
export function KeyholeBackdrop() {
  return (
    <svg
      aria-hidden="true"
      viewBox={TEAM_BACKDROP_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <defs>
        <pattern id="team-hex-grid" width="24" height="42" patternUnits="userSpaceOnUse">
          <g fill="none" strokeWidth="0.75" className="stroke-soft-white/10">
            <polygon points={hexPoints(12, 14)} />
            <polygon points={hexPoints(0, 35)} />
            <polygon points={hexPoints(24, 35)} />
            <polygon points={hexPoints(0, -7)} />
            <polygon points={hexPoints(24, -7)} />
          </g>
        </pattern>
      </defs>
      <rect width="400" height="340" fill="url(#team-hex-grid)" />
      <g
        className={`opacity-0 transition-opacity ${TEAM_HOVER_TIMING} group-hover:opacity-100 group-focus-visible:opacity-100`}
      >
        {LIT_HEXES.map(([cx, cy]) => (
          <polygon
            key={`${cx}-${cy}`}
            points={hexPoints(cx, cy)}
            className="fill-emerald-brand/25"
          />
        ))}
        {RADAR.map((r) => (
          <circle
            key={r}
            cx="200"
            cy="170"
            r={r}
            fill="none"
            strokeWidth="1"
            className="stroke-emerald-brand/30"
          />
        ))}
      </g>
      <g
        strokeWidth="1.5"
        className={`fill-soft-white/[0.04] stroke-soft-white/25 transition-colors ${TEAM_HOVER_TIMING} group-hover:stroke-emerald-brand`}
      >
        <circle cx="200" cy="150" r="30" />
        <path d="M188 172 L182 250 H218 L212 172 Z" />
      </g>
      <circle cx="326" cy="98" r="3" className="fill-canary" />
    </svg>
  );
}
