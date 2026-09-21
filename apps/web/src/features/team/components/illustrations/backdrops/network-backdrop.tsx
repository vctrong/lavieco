import { TEAM_BACKDROP_VIEWBOX } from "../../../constants/config";

const NODES = [
  [56, 70],
  [140, 34],
  [250, 76],
  [346, 44],
  [84, 176],
  [318, 168],
  [366, 268],
  [40, 282],
] as const;

const EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 4],
  [2, 5],
  [3, 5],
  [5, 6],
  [4, 7],
] as const;

const CANARY_NODE = 2;

/** 01 · Trọng: a node-and-line graph over a dot grid, like a QR module field. */
export function NetworkBackdrop() {
  return (
    <svg
      aria-hidden="true"
      viewBox={TEAM_BACKDROP_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <defs>
        <pattern id="team-qr-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect x="7" y="7" width="2" height="2" className="fill-soft-white/15" />
        </pattern>
      </defs>
      <rect width="400" height="340" fill="url(#team-qr-grid)" />
      {EDGES.map(([from, to]) => (
        <line
          key={`base-${from}-${to}`}
          x1={NODES[from][0]}
          y1={NODES[from][1]}
          x2={NODES[to][0]}
          y2={NODES[to][1]}
          className="stroke-soft-white/20"
          strokeWidth="1"
        />
      ))}
      {EDGES.map(([from, to], index) => (
        <line
          key={`draw-${from}-${to}`}
          x1={NODES[from][0]}
          y1={NODES[from][1]}
          x2={NODES[to][0]}
          y2={NODES[to][1]}
          pathLength="100"
          strokeWidth="1"
          style={{ transitionDelay: `${index * 70}ms` }}
          className="stroke-emerald-brand transition-[stroke-dashoffset] duration-700 ease-out [stroke-dasharray:100] [stroke-dashoffset:100] motion-safe:group-hover:[stroke-dashoffset:0]"
        />
      ))}
      {NODES.map(([cx, cy], index) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={index === CANARY_NODE ? 4 : 3}
          style={{ transitionDelay: `${index * 70}ms` }}
          className={
            index === CANARY_NODE
              ? "fill-canary"
              : "fill-soft-white/50 transition-colors duration-500 group-hover:fill-emerald-brand"
          }
        />
      ))}
    </svg>
  );
}
