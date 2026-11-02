import type { Metadata } from "next";

import { VOUCHER_SCOPES, VOUCHER_STATUSES } from "@lavieco/shared/events";

import { VOUCHERS_TEXT, VouchersListPage, loadVouchers } from "@/features/vouchers";

export const metadata: Metadata = { title: VOUCHERS_TEXT.vi.meta.list };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const pick = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
  allowed.includes(value as T) ? (value as T) : undefined;

export default async function VouchersRoute({ searchParams }: PageProps<"/vouchers">) {
  const params = await searchParams;
  const filters = {
    scope: pick(first(params.scope), VOUCHER_SCOPES),
    status: pick(first(params.status), VOUCHER_STATUSES),
    q: first(params.q)?.trim().slice(0, 60) || undefined,
  };
  const page = await loadVouchers({ ...filters, cursor: first(params.cursor)?.slice(0, 512) });
  return <VouchersListPage page={page} filters={filters} />;
}
