/**
 * Design tokens for HTML email. Email clients only honour inline styles, so the
 * packages/ui tokens (theme.css) are mirrored here as literal values: this is the one
 * place outside theme.css allowed to hold colour values (docs/04 §8). Keep in sync.
 */
export const EMAIL_COLORS = {
  /** --color-emerald-brand: accents and the primary button (with deep-blue text). */
  emerald: "#10B183",
  /** --color-mint-mist */
  mint: "#EAF8F3",
  /** --color-deep-blue: headings, labels, footer background. */
  deepBlue: "#20345F",
  /** --color-canary: header rule and the safety-note frame. */
  canary: "#E7DD6A",
  /** canary at ~25% on white (`bg-canary/25` on the web). */
  canarySoft: "#F9F7DA",
  /** --color-soft-white: page background. */
  softWhite: "#F8FAF6",
  /** --color-charcoal: body text. */
  charcoal: "#1E2A32",
  /** charcoal/70 on white, for secondary text (contrast 6:1). */
  muted: "#55606A",
  /** --color-hairline (deep-blue 12%) flattened on white. */
  hairline: "#DFE3EA",
  white: "#FFFFFF",
} as const;

/**
 * Fraunces / Be Vietnam Pro are declared but never loaded: the fallbacks must carry it.
 * Not Georgia: it lacks the stacked Vietnamese marks (ế, ồ, ắ…) and splits them apart.
 */
export const EMAIL_FONTS = {
  display: "Fraunces,'Times New Roman',Times,serif",
  body: "'Be Vietnam Pro',Arial,Helvetica,sans-serif",
  mono: "Consolas,'Courier New',monospace",
} as const;

/** Public contact details of LAVIECO (same as apps/web `CONTACT_INFO`). */
export const EMAIL_BRAND = {
  name: "LAVIECO",
  tagline: "Giáo dục sáng tạo xanh, thông qua nghệ thuật",
  siteUrl: "https://lavieco.io.vn",
  email: "lavieco@gmail.com",
  phone: "0336 922 235",
} as const;
