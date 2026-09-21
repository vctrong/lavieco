import type { Metadata } from "next";

import { publicEnv } from "@/lib/env.public";
import { SITE_TEXT } from "@/shared/constants/text";
import { FONT_VARIABLE_CLASSES } from "@/shared/fonts";

import "./globals.css";

const text = SITE_TEXT.vi;

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: text.metaTitle,
  description: text.metaDescription,
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: text.siteName,
    title: text.metaTitle,
    description: text.metaDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: text.metaTitle,
    description: text.metaDescription,
  },
};

/**
 * Document shell only. The site chrome (dock, footer) lives in `(site)/layout.tsx`
 * so that utility pages (404, 500, coming soon) can render full-bleed without it.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${FONT_VARIABLE_CLASSES} scroll-smooth antialiased`}>
      <body className="film-grain relative overflow-x-hidden bg-soft-white font-sans text-charcoal">
        {children}
      </body>
    </html>
  );
}
