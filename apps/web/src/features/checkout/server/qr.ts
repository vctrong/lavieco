import "server-only";

import { toDataURL } from "qrcode";

/**
 * A QR code as a PNG data URL, rendered on demand and never stored (CLAUDE §7): ticket
 * QR tokens, and the VietQR string of a pending payment.
 */
export function qrDataUrl(text: string, width = 320): Promise<string> {
  return toDataURL(text, { errorCorrectionLevel: "M", margin: 1, width });
}
