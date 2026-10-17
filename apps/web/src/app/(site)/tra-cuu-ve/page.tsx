import type { Metadata } from "next";

import { CHECKOUT_TEXT, LookupPage } from "@/features/checkout";

export const metadata: Metadata = {
  title: CHECKOUT_TEXT.vi.meta.lookup,
  robots: { index: false, follow: true },
};

export default function LookupRoute() {
  return <LookupPage />;
}
