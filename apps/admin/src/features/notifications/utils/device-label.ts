/** "iPhone · Safari"-style label from a user agent, for the device list only. */
export function deviceLabelOf(userAgent: string): string {
  const device = /iPhone/.test(userAgent)
    ? "iPhone"
    : /iPad/.test(userAgent)
      ? "iPad"
      : /Android/.test(userAgent)
        ? "Android"
        : /Windows/.test(userAgent)
          ? "Windows"
          : /Macintosh/.test(userAgent)
            ? "Mac"
            : "";
  const browser = /EdgA?\/|Edg\//.test(userAgent)
    ? "Edge"
    : /SamsungBrowser/.test(userAgent)
      ? "Samsung Internet"
      : /CriOS|Chrome\//.test(userAgent)
        ? "Chrome"
        : /FxiOS|Firefox\//.test(userAgent)
          ? "Firefox"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "";
  return [device, browser].filter(Boolean).join(" · ").slice(0, 60);
}
