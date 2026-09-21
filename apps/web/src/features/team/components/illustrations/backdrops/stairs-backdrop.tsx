import { TEAM_BACKDROP_VIEWBOX, TEAM_HOVER_TIMING } from "../../../constants/config";

const STEPS = [
  { x: 24, height: 90 },
  { x: 104, height: 130 },
  { x: 184, height: 172 },
  { x: 264, height: 214 },
] as const;

/** 04 · Xuân Anh: arches climbing like the four steps, a dashed route, paper cut-outs. */
export function StairsBackdrop() {
  return (
    <svg
      aria-hidden="true"
      viewBox={TEAM_BACKDROP_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <g
        className={`transition-transform ${TEAM_HOVER_TIMING} motion-safe:group-hover:-translate-y-2`}
      >
        {STEPS.map(({ x, height }) => (
          <path
            key={x}
            d={`M${x} 340 V${340 - height + 36} a36 36 0 0 1 72 0 V340 z`}
            strokeWidth="1"
            className="fill-emerald-brand/[0.13] stroke-emerald-brand/40"
          />
        ))}
      </g>
      <path
        d="M16 300 C120 270 170 190 384 60"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        className={`stroke-emerald-brand/45 transition-[stroke] ${TEAM_HOVER_TIMING} [stroke-dasharray:3_8] group-hover:stroke-emerald-brand/75`}
      />
      <circle cx="338" cy="44" r="11" className="fill-soft-white" />
      <path d="M52 60 l4 11 11 4 -11 4 -4 11 -4 -11 -11 -4 11 -4 z" className="fill-canary" />
    </svg>
  );
}
