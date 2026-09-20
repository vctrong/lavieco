import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAVIECO",
  description: "Nền tảng giáo dục mỹ thuật xanh: từ vỏ hải sản đến tác phẩm và Cẩm nang xanh.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
