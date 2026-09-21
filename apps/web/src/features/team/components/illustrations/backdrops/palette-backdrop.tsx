import { TEAM_BACKDROP_VIEWBOX } from "../../../constants/config";
import { TEXT } from "../../../constants/text";

const PIVOT = "[transform-origin:200px_330px]";

/**
 * Six brand-colour chips fanned behind the shoulders. Full class names so Tailwind
 * sees them; `rest` and `open` are the fan angle before and during hover.
 */
const CHIPS = [
  {
    fill: "fill-deep-blue",
    rest: "-rotate-[46deg]",
    open: "motion-safe:group-hover:-rotate-[64deg]",
  },
  {
    fill: "fill-emerald-brand",
    rest: "-rotate-[28deg]",
    open: "motion-safe:group-hover:-rotate-[38deg]",
  },
  {
    fill: "fill-mint-mist stroke-deep-blue/25",
    rest: "-rotate-[10deg]",
    open: "motion-safe:group-hover:-rotate-[13deg]",
  },
  {
    fill: "fill-charcoal",
    rest: "rotate-[10deg]",
    open: "motion-safe:group-hover:rotate-[13deg]",
  },
  {
    fill: "fill-soft-white stroke-deep-blue/25",
    rest: "rotate-[28deg]",
    open: "motion-safe:group-hover:rotate-[38deg]",
  },
  {
    fill: "fill-canary",
    rest: "rotate-[46deg]",
    open: "motion-safe:group-hover:rotate-[64deg]",
    small: true,
  },
] as const;

const CHIP_PATH = "M181 128 V96 a19 19 0 0 1 38 0 V128 z";
const SMALL_CHIP_PATH = "M188 140 V128 a12 12 0 0 1 24 0 V140 z";

/** 03 · Vy: a swatch fan of brand colours and a very faint italic "Aa". */
export function PaletteBackdrop() {
  return (
    <svg
      aria-hidden="true"
      viewBox={TEAM_BACKDROP_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <text
        x="200"
        y="250"
        textAnchor="middle"
        className="fill-deep-blue/[0.06] font-display text-[240px] italic"
      >
        {TEXT.vi.backdrop.swatchGlyph}
      </text>
      {CHIPS.map((chip) => (
        <g
          key={chip.fill}
          className={`${PIVOT} ${chip.rest} ${chip.open} transition-transform duration-500 ease-out`}
        >
          <path
            d={"small" in chip ? SMALL_CHIP_PATH : CHIP_PATH}
            strokeWidth="1"
            className={chip.fill}
          />
        </g>
      ))}
    </svg>
  );
}
