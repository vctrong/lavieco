import type { Metadata, Viewport } from "next";

import { PWA_COLORS, PWA_TEXT, ServiceWorkerRegistrar } from "@/features/pwa";
import { FONT_VARIABLE_CLASSES } from "@/shared/fonts";
import { SITE_TEXT } from "@/shared/constants/text";

import "./globals.css";

export const metadata: Metadata = {
  title: SITE_TEXT.vi.title,
  robots: { index: false, follow: false },
  // Installed on iOS from Safari's "Thêm vào MH chính" (docs/PWA.md).
  appleWebApp: {
    capable: true,
    title: PWA_TEXT.vi.manifest.shortName,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Content may run under the notch and home bar: the shell pads with safe-area insets.
  viewportFit: "cover",
  themeColor: PWA_COLORS.theme,
};

/** Document shell only; the admin chrome lives in `(dashboard)/layout.tsx`. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${FONT_VARIABLE_CLASSES} antialiased`}>
      <body className="bg-soft-white font-sans text-charcoal">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
