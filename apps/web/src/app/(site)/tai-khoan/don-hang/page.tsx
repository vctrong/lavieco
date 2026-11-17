import type { Metadata } from "next";

import { Container } from "@lavieco/ui";

import { MyOrdersSection, SHOP_TEXT, getMyShopOrders } from "@/features/shop";

export const metadata: Metadata = { title: SHOP_TEXT.vi.account.title, robots: { index: false } };

export default async function MyOrdersRoute() {
  return (
    <Container className="py-10 md:py-14">
      <MyOrdersSection items={await getMyShopOrders()} />
    </Container>
  );
}
