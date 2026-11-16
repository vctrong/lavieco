/** Running as the installed app (Android `display-mode`, iOS `navigator.standalone`). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios || window.matchMedia("(display-mode: standalone)").matches;
}

/** iPhone/iPad (iPadOS reports itself as a Mac with touch). */
export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}
