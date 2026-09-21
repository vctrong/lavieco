/**
 * The sparkles that radiate from behind each portrait while its card is hovered.
 *
 * `angle` is in degrees on the arch (0 = right, -90 = straight up, ±180 = left), so the
 * stars sit around the top and over both shoulders. `radius` is the start distance from
 * the arch centre as a fraction of the arch width (0.5 is the arch edge, so larger values
 * start just outside it). `travel` is how far, in px, the star drifts outward. `size` is
 * px, `delay` and `duration` are seconds, `turn` is the final rotation in degrees (≤ 45).
 * The layer sits UNDER the person, so a star can never cover a face or body.
 */
export const SPARKLES = [
  { angle: -168, radius: 0.6, travel: 34, size: 12, delay: 0, duration: 2.2, turn: 30 },
  { angle: -136, radius: 0.58, travel: 40, size: 7, delay: 0.7, duration: 2.6, turn: -35 },
  { angle: -104, radius: 0.62, travel: 30, size: 14, delay: 1.3, duration: 2.4, turn: 40 },
  { angle: -72, radius: 0.6, travel: 38, size: 6, delay: 0.35, duration: 1.9, turn: -25 },
  { angle: -38, radius: 0.59, travel: 42, size: 11, delay: 1.0, duration: 2.5, turn: 35 },
  { angle: -6, radius: 0.61, travel: 32, size: 5, delay: 1.6, duration: 2.1, turn: -40 },
  { angle: 172, radius: 0.6, travel: 30, size: 8, delay: 0.5, duration: 2.3, turn: -30 },
] as const;

/**
 * Colour of the stars by backdrop brightness (full class names for Tailwind). Every
 * second star uses the second colour. Dark backdrops get a pale Canary with a faint
 * glow; light ones a deep Emerald and a pale Deep Blue, so nothing washes out.
 */
export const SPARKLE_COLORS = {
  dark: [
    "text-canary/80 drop-shadow-[0_0_3px_color-mix(in_srgb,var(--color-canary)_55%,transparent)]",
    "text-canary/60 drop-shadow-[0_0_3px_color-mix(in_srgb,var(--color-canary)_40%,transparent)]",
  ],
  mid: [
    "text-emerald-brand/80",
    "text-mint-mist drop-shadow-[0_0_2px_color-mix(in_srgb,var(--color-emerald-brand)_60%,transparent)]",
  ],
  light: ["text-emerald-brand", "text-deep-blue/45"],
} as const;
