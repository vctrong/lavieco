import type { Metadata } from "next";

import { FONT_VARIABLE_CLASSES } from "@/shared/fonts";
import { SITE_TEXT } from "@/shared/constants/text";

import "./globals.css";

export const metadata: Metadata = {
  title: SITE_TEXT.vi.title,
  robots: { index: false, follow: false },
};

/** Document shell only; the admin chrome lives in `(dashboard)/layout.tsx`. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${FONT_VARIABLE_CLASSES} antialiased`}>
      <body className="bg-soft-white font-sans text-charcoal">{children}</body>
    </html>
  );
}
