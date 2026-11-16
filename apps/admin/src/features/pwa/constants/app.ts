/**
 * The installed app (docs/PWA.md). The manifest and the browser chrome need literal
 * colors, not CSS variables: these are copies of the `theme.css` tokens, the only hex
 * allowed outside it besides the email tokens (docs/04 §5). Keep them in step.
 */
export const PWA_COLORS = {
  /** `--color-soft-white`: status bar and task switcher, same as the app header. */
  theme: "#f8faf6",
  /** `--color-soft-white`: splash screen behind the icon. */
  background: "#f8faf6",
} as const;

/** Files under `public/` the browser fetches without a session (see `proxy.ts`). */
export const PWA_PATHS = {
  serviceWorker: "/sw.js",
  offline: "/offline.html",
  icons: {
    any192: "/icons/icon-192.png",
    any512: "/icons/icon-512.png",
    maskable512: "/icons/icon-maskable-512.png",
  },
} as const;

/** The install hint stays hidden this long after "Để sau". */
export const INSTALL_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
export const INSTALL_SNOOZE_KEY = "lv-admin-install-snoozed-at";
