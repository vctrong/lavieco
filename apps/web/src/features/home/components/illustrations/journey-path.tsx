/** Dashed tide line linking the four stages (large screens only). Decorative. */
export function JourneyPath() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 z-0 hidden size-full lg:block"
      preserveAspectRatio="none"
      viewBox="0 0 1200 620"
    >
      <path
        d="M 40 420 C 180 390, 240 320, 360 330 C 480 340, 540 240, 680 230 C 820 220, 920 120, 1140 100"
        fill="none"
        className="stroke-emerald-brand"
        strokeDasharray="6 6"
        strokeWidth="2"
      />
      <circle cx="120" cy="405" r="5" className="fill-emerald-brand" />
      <circle cx="420" cy="328" r="5" className="fill-emerald-brand" />
      <circle cx="720" cy="225" r="5" className="fill-emerald-brand" />
      <circle cx="1040" cy="108" r="6" className="fill-canary" />
    </svg>
  );
}
