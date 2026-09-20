import type { Metadata } from "next";
import { Be_Vietnam_Pro, Fraunces } from "next/font/google";

import { Footer, MAIN_CONTENT_ID, SkipLink, TideDock, TideLine } from "@/features/navigation";
import { publicEnv } from "@/lib/env.public";
import { PearlCursorLoader } from "@/shared/components/pearl-cursor-loader";
import { SITE_TEXT } from "@/shared/constants/text";

import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin", "vietnamese"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-fraunces",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${fraunces.variable} ${beVietnamPro.variable} scroll-smooth antialiased`}
    >
      <body className="film-grain relative overflow-x-hidden bg-soft-white font-sans text-charcoal">
        <SkipLink />
        <TideLine />
        <TideDock />
        <main id={MAIN_CONTENT_ID}>{children}</main>
        <Footer />
        <PearlCursorLoader />
      </body>
    </html>
  );
}
