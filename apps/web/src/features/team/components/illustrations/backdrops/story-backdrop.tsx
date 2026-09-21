import { TEAM_BACKDROP_VIEWBOX } from "../../../constants/config";
import { TEXT } from "../../../constants/text";

const LINES = [
  { y: 236, width: 240 },
  { y: 258, width: 200 },
  { y: 280, width: 250 },
  { y: 302, width: 160 },
] as const;

/** 05 · Thi: a paper story card, a giant italic quote mark, ruled lines like a letter. */
export function StoryBackdrop() {
  return (
    <svg
      aria-hidden="true"
      viewBox={TEAM_BACKDROP_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full origin-bottom transition-transform duration-500 ease-out motion-safe:group-hover:rotate-[0.8deg]"
    >
      <text
        x="34"
        y="200"
        className="fill-deep-blue/10 font-display text-[280px] italic transition-transform duration-700 ease-out motion-safe:[transform:translate(-10px,-6px)] motion-safe:group-hover:[transform:translate(0,0)]"
      >
        {TEXT.vi.backdrop.quoteMark}
      </text>
      {LINES.map(({ y, width }, index) => (
        <rect
          key={y}
          x="40"
          y={y}
          width={width}
          height="1"
          style={{ transitionDelay: `${index * 90}ms` }}
          className="origin-left fill-deep-blue/25 transition-transform duration-700 ease-out [transform-box:fill-box] motion-safe:[transform:scaleX(0.55)] motion-safe:group-hover:[transform:scaleX(1)]"
        />
      ))}
      <g transform="rotate(8 350 60)">
        <rect
          x="322"
          y="36"
          width="56"
          height="48"
          rx="3"
          fill="none"
          strokeWidth="1"
          className="stroke-deep-blue/30 [stroke-dasharray:3_3]"
        />
        <text
          x="350"
          y="66"
          textAnchor="middle"
          className="fill-deep-blue/45 font-mono text-[13px]"
        >
          {TEXT.vi.backdrop.stampLabel}
        </text>
      </g>
    </svg>
  );
}
