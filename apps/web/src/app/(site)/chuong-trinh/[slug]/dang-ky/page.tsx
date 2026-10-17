import type { Metadata } from "next";

import { CHECKOUT_TEXT, CheckoutPage } from "@/features/checkout";

export const metadata: Metadata = {
  title: CHECKOUT_TEXT.vi.checkout.eyebrow,
  robots: { index: false, follow: false },
};

export default async function CheckoutRoute({ params }: PageProps<"/chuong-trinh/[slug]/dang-ky">) {
  const { slug } = await params;
  return <CheckoutPage slug={slug} />;
}
