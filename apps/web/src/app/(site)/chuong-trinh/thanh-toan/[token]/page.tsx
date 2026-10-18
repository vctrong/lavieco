import type { Metadata } from "next";

import { CHECKOUT_TEXT, PaymentPage } from "@/features/checkout";

export const metadata: Metadata = {
  title: CHECKOUT_TEXT.vi.meta.payment,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PaymentRoute({
  params,
  searchParams,
}: PageProps<"/chuong-trinh/thanh-toan/[token]">) {
  const { token } = await params;
  const query = await searchParams;
  return (
    <PaymentPage token={token} returned={query["ket-qua"] === "1"} cancelled={query.huy === "1"} />
  );
}
