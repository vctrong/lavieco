import type { Metadata } from "next";

import { EditVoucherPage, VOUCHERS_TEXT, loadEventChoices, loadVoucher } from "@/features/vouchers";

export const metadata: Metadata = { title: VOUCHERS_TEXT.vi.meta.edit };

export default async function EditVoucherRoute({ params }: PageProps<"/vouchers/[id]">) {
  const { id } = await params;
  const [{ voucher, stats }, events] = await Promise.all([loadVoucher(id), loadEventChoices()]);
  return <EditVoucherPage voucher={voucher} stats={stats} events={events} />;
}
