import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { SHOP_TEXT, ShopPaymentPage, getShopOrder, qrImage } from "@/features/shop";

export const metadata: Metadata = {
  title: SHOP_TEXT.vi.payment.metaTitle,
  robots: { index: false },
};

export default async function ShopPaymentRoute({ params }: PageProps<"/thanh-toan/[token]">) {
  const { token } = await params;
  const order = await getShopOrder(token);
  if (!order) notFound();
  if (order.status !== "awaiting_payment" || !order.payment) redirect(`/don-hang/${token}`);
  return (
    <ShopPaymentPage token={token} initial={order} qrImage={await qrImage(order.payment.qrCode)} />
  );
}
