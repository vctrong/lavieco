"use client"; // Error boundaries must be Client Components

import { ServerErrorView, serverErrorTitle } from "@/features/server-error";
import { FONT_VARIABLE_CLASSES } from "@/shared/fonts";

import "./globals.css";

/**
 * Catches errors thrown by the root layout, so it replaces it: it needs its own document
 * tags, fonts and stylesheet. `metadata` is not supported here, hence the `<title>` element.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="vi" className={`${FONT_VARIABLE_CLASSES} antialiased`}>
      <body className="film-grain relative overflow-x-hidden bg-soft-white font-sans text-charcoal">
        <title>{serverErrorTitle}</title>
        <ServerErrorView error={error} retry={retry} />
      </body>
    </html>
  );
}
