import type { Metadata } from "next";

import { CHECKOUT_TEXT, CheckoutPage } from "@/features/checkout";

export const metadata: Metadata = {
  title: CHECKOUT_TEXT.vi.checkout.eyebrow,
  robots: { index: false, follow: false },
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function CheckoutRoute({
  params,
  searchParams,
}: PageProps<"/chuong-trinh/[slug]/dang-ky">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  // `?ve=&sl=` from the ticket box only pre-fills the form (validated there and by the service).
  return <CheckoutPage slug={slug} pick={{ ve: first(query.ve), sl: first(query.sl) }} />;
}
