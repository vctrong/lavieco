import { TEAM_BACKDROP_VIEWBOX, TEAM_HOVER_TIMING } from "../../../constants/config";

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
      {NODES.map(([cx, cy], index) =>
        index === CANARY_NODE ? null : (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3} className="fill-soft-white/50" />
        ),
      )}
      {/* Hover overlay: one group fades in, instead of animating each line and node. */}
      <g
        className={`opacity-0 transition-opacity ${TEAM_HOVER_TIMING} group-hover:opacity-100 group-focus-visible:opacity-100`}
      >
        {EDGES.map(([from, to]) => (
          <line
            key={`lit-${from}-${to}`}
            x1={NODES[from][0]}
            y1={NODES[from][1]}
            x2={NODES[to][0]}
            y2={NODES[to][1]}
            className="stroke-emerald-brand"
            strokeWidth="1"
          />
        ))}
        {NODES.map(([cx, cy], index) =>
          index === CANARY_NODE ? null : (
            <circle key={`lit-${cx}-${cy}`} cx={cx} cy={cy} r={3} className="fill-emerald-brand" />
          ),
        )}
      </g>
      <circle cx={NODES[CANARY_NODE][0]} cy={NODES[CANARY_NODE][1]} r={4} className="fill-canary" />
    </svg>
  );
}
