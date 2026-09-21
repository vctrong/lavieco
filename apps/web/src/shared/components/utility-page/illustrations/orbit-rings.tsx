/** Slowly turning dotted rings behind the coming-soon page. Decorative. */
export function OrbitRings() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 800 800"
      fill="none"
      className="size-245 max-w-none text-deep-blue opacity-30 motion-safe:animate-orbit-slow"
    >
      <circle
        cx="400"
        cy="400"
        r="110"
        stroke="currentColor"
        strokeDasharray="2 6"
        opacity="0.25"
      />
      <circle cx="400" cy="400" r="175" stroke="currentColor" opacity="0.2" />
      <circle
        cx="400"
        cy="400"
        r="245"
        stroke="currentColor"
        strokeDasharray="3 9"
        opacity="0.18"
      />
      <circle cx="400" cy="400" r="320" stroke="currentColor" opacity="0.15" />
      <circle
        cx="400"
        cy="400"
        r="390"
        stroke="currentColor"
        strokeDasharray="1 10"
        opacity="0.1"
      />
    </svg>
  );
}
