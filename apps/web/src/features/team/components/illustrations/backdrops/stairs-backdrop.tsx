import { TEAM_BACKDROP_VIEWBOX } from "../../../constants/config";

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
      {STEPS.map(({ x, height }, index) => (
        <path
          key={x}
          d={`M${x} 340 V${340 - height + 36} a36 36 0 0 1 72 0 V340 z`}
          strokeWidth="1"
          style={{ transitionDelay: `${index * 80}ms` }}
          className="fill-emerald-brand/[0.13] stroke-emerald-brand/40 transition-transform duration-500 ease-out motion-safe:group-hover:-translate-y-3"
        />
      ))}
      <path
        d="M16 300 C120 270 170 190 384 60"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="stroke-emerald-brand/60 transition-[stroke-dashoffset] duration-[1400ms] ease-linear [stroke-dasharray:3_8] [stroke-dashoffset:0] motion-safe:group-hover:[stroke-dashoffset:-88]"
      />
      <circle cx="338" cy="44" r="11" className="fill-soft-white" />
      <path d="M52 60 l4 11 11 4 -11 4 -4 11 -4 -11 -11 -4 11 -4 z" className="fill-canary" />
    </svg>
  );
}
