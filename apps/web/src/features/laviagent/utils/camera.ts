/**
 * Which "Chụp ảnh" to use, by capability, never by user agent: a touch-first device
 * opens its camera app through `<input capture>`; elsewhere (laptops, where browsers
 * ignore `capture`) the webcam dialog, if the browser can stream a camera at all.
 */
export function prefersNativeCapture(): boolean {
  if (typeof window === "undefined") return true;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const canStream = typeof navigator.mediaDevices?.getUserMedia === "function";
  return coarse || !canStream;
}
