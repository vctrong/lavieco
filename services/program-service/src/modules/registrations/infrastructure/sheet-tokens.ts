/**
 * Design tokens for `.xlsx` exports. Excel takes colours as ARGB literals, so the
 * packages/ui tokens (theme.css) are mirrored here, like the email tokens of
 * service-kit (docs/04 §8). Each value names its token. Keep in sync with theme.css.
 */
export const SHEET_COLORS = {
  /** --color-deep-blue: header row background, summary title. */
  deepBlue: "FF20345F",
  /** --color-charcoal: body text. */
  charcoal: "FF1E2A32",
  /** charcoal/70 on white: secondary text (cancelled, expired). Same as EMAIL_COLORS.muted. */
  muted: "FF55606A",
  /** --color-soft-white: every other data row. */
  softWhite: "FFF8FAF6",
  /** --color-mint-mist: background of a "done" status. */
  mint: "FFEAF8F3",
  /** --color-emerald-ink: text of a "done" status (AA on mint). */
  emeraldInk: "FF007A57",
  /** --color-canary at ~25% on white: background of a status that needs a look. */
  canarySoft: "FFF9F7DA",
  /** --color-error: refunded. */
  error: "FFBA1A1A",
  /** --color-hairline (deep-blue 12%) flattened on white: cell borders. */
  hairline: "FFDFE3EA",
  white: "FFFFFFFF",
} as const;
