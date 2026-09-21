import { TEAM_BACKDROP_VIEWBOX, TEAM_HOVER_TIMING } from "../../../constants/config";
import { TEXT } from "../../../constants/text";

/** Deterministic scatter (no Math.random: the markup must match between renders). */
function buildParticles(count: number) {
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, () => {
    const y = next() * 340;
    // Finer towards the top, like a sieve run from coarse to fine mesh.
    const r = 0.6 + (y / 340) * 2.4;
    return { cx: Math.round(next() * 400), cy: Math.round(y), r: Math.round(r * 10) / 10 };
  });
}

const PARTICLES = buildParticles(72);
const RINGS = [46, 72, 98] as const;

/** 02 · Quỳnh: shell-powder particles and "specimen" rings, labelled with a mesh size. */
export function ParticlesBackdrop() {
  return (
    <svg
      aria-hidden="true"
      viewBox={TEAM_BACKDROP_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <g
        className={`origin-center transition-transform ${TEAM_HOVER_TIMING} [transform-box:fill-box] motion-safe:group-hover:scale-[1.1]`}
      >
        {RINGS.map((r) => (
          <circle
            key={r}
            cx="200"
            cy="150"
            r={r}
            fill="none"
            strokeWidth="1"
            className="stroke-emerald-brand/25"
          />
        ))}
      </g>
      <g
        className={`transition-transform ${TEAM_HOVER_TIMING} motion-safe:group-hover:-translate-y-2`}
      >
        {PARTICLES.map(({ cx, cy, r }) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} className="fill-deep-blue/25" />
        ))}
      </g>
      <line x1="40" y1="44" x2="72" y2="44" className="stroke-deep-blue/40" strokeWidth="1" />
      <text
        x="78"
        y="47"
        className="fill-deep-blue/50 font-mono text-[9px] uppercase tracking-widest"
      >
        {TEXT.vi.backdrop.meshLabel}
      </text>
    </svg>
  );
}
