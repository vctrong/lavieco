import Link from "next/link";
import { FiArrowLeft, FiArrowRight, FiPlus } from "react-icons/fi";

import {
  VOUCHER_SCOPES,
  VOUCHER_STATUSES,
  type VoucherList,
  type VoucherStats,
  type VoucherView,
} from "@lavieco/shared/events";
import { Button, SelectField, TextField } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import { VoucherActions } from "./voucher-actions";
import { VoucherForm } from "./voucher-form";

const t = TEXT.vi;
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

function discountText(voucher: Pick<VoucherView, "discountType" | "value">) {
  return voucher.discountType === "percent"
    ? t.summary.percent(voucher.value)
    : t.summary.fixed(money.format(voucher.value));
}

function VoucherRow({ voucher }: { voucher: VoucherView }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline px-5 py-4 last:border-b-0">
      <div className="min-w-0">
        <Link
          href={`/vouchers/${voucher.id}`}
          className="font-mono text-[15px] font-semibold tracking-wider text-deep-blue hover:text-emerald-ink"
        >
          {voucher.code}
        </Link>
        <p className="mt-0.5 text-[13px] text-charcoal/80">
          {voucher.name} · {discountText(voucher)}
        </p>
        <p className="mt-0.5 text-[12px] text-charcoal/60">
          {t.scope[voucher.scope]} · {t.status[voucher.status]} ·{" "}
          {t.summary.uses(voucher.used, voucher.held, voucher.totalUses)}
        </p>
      </div>
      <VoucherActions voucher={voucher} />
    </li>
  );
}

type Filters = { scope?: string; status?: string; q?: string };

/** `/vouchers`: filters are a plain GET form, pages use a cursor. */
export function VouchersListPage({ page, filters }: { page: VoucherList; filters: Filters }) {
  const any = { value: "", label: t.filters.any };
  const nextParams = new URLSearchParams(
    Object.entries({ ...filters, cursor: page.nextCursor ?? "" }).filter(([, value]) => value) as [
      string,
      string,
    ][],
  );
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-museum text-deep-blue/60">
            {t.eyebrow}
          </p>
          <h1 className="font-display text-3xl text-deep-blue md:text-4xl">{t.title}</h1>
          <p className="mt-2 text-[14.5px] text-charcoal/75">{t.intro}</p>
        </div>
        <Button as={Link} href="/vouchers/new" size="sm">
          <FiPlus aria-hidden="true" size={15} />
          {t.create}
        </Button>
      </header>
      <form
        method="get"
        action="/vouchers"
        aria-label={t.filters.label}
        className="mb-6 grid gap-4 rounded-3xl border border-hairline bg-white p-5 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))_auto]"
      >
        <TextField tone="light" label={t.filters.q} name="q" defaultValue={filters.q ?? ""} />
        <SelectField
          tone="light"
          label={t.filters.scope}
          name="scope"
          defaultValue={filters.scope ?? ""}
          options={[any, ...VOUCHER_SCOPES.map((value) => ({ value, label: t.scope[value] }))]}
        />
        <SelectField
          tone="light"
          label={t.filters.status}
          name="status"
          defaultValue={filters.status ?? ""}
          options={[any, ...VOUCHER_STATUSES.map((value) => ({ value, label: t.status[value] }))]}
        />
        <div className="flex items-end">
          <Button type="submit" variant="deep" size="sm" className="h-10.5 px-5">
            {t.filters.apply}
          </Button>
        </div>
      </form>
      <section className="overflow-hidden rounded-3xl border border-hairline bg-white shadow-ambient">
        {page.items.length === 0 ? (
          <p className="px-5 py-16 text-center text-[14px] text-charcoal/60">{t.empty}</p>
        ) : (
          <ul>
            {page.items.map((voucher) => (
              <VoucherRow key={voucher.id} voucher={voucher} />
            ))}
          </ul>
        )}
      </section>
      {page.nextCursor ? (
        <div className="mt-5 flex justify-end">
          <Link
            href={`/vouchers?${nextParams.toString()}`}
            className="flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-[12.5px] text-deep-blue hover:bg-mint-mist"
          >
            {t.next}
            <FiArrowRight aria-hidden="true" size={13} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function BackToList() {
  return (
    <Link
      href="/vouchers"
      className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-deep-blue/70 hover:text-deep-blue"
    >
      <FiArrowLeft aria-hidden="true" size={13} />
      {t.back}
    </Link>
  );
}

export function NewVoucherPage({
  events,
  presetEventId,
}: {
  events: { id: string; title: string }[];
  presetEventId: string | null;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <BackToList />
      <h1 className="mb-8 font-display text-3xl text-deep-blue md:text-4xl">{t.meta.create}</h1>
      <VoucherForm voucher={null} presetEventId={presetEventId} events={events} />
    </div>
  );
}

export function EditVoucherPage({
  voucher,
  stats,
  events,
}: {
  voucher: VoucherView;
  stats: VoucherStats;
  events: { id: string; title: string }[];
}) {
  const figures = [
    [t.stats.paidOrders, String(stats.paidOrders)],
    [t.stats.totalDiscount, money.format(stats.totalDiscount)],
    [t.stats.revenue, money.format(stats.revenue)],
  ] as const;
  return (
    <div className="mx-auto max-w-4xl">
      <BackToList />
      <h1 className="font-mono text-3xl font-semibold tracking-wider text-deep-blue">
        {voucher.code}
      </h1>
      <p className="mb-5 mt-1 text-[13px] text-charcoal/65">
        {t.status[voucher.status]} · {t.summary.uses(voucher.used, voucher.held, voucher.totalUses)}
      </p>
      <div className="mb-6">
        <VoucherActions voucher={voucher} />
      </div>
      <section
        aria-label={t.stats.title}
        className="mb-6 grid gap-4 rounded-3xl border border-hairline bg-white p-5 sm:grid-cols-3"
      >
        {figures.map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] font-semibold uppercase tracking-museum text-deep-blue/60">
              {label}
            </p>
            <p className="mt-1 font-display text-2xl text-deep-blue">{value}</p>
          </div>
        ))}
      </section>
      <VoucherForm voucher={voucher} events={events} />
    </div>
  );
}

/** "Mã giảm giá" of the event editor: composed by the route, since features stay apart. */
export function EventVouchersSection({
  eventId,
  vouchers,
}: {
  eventId: string;
  vouchers: VoucherView[];
}) {
  const s = t.eventSection;
  return (
    <section
      id="ma-giam-gia"
      aria-labelledby="ma-giam-gia-title"
      className="scroll-mt-24 rounded-3xl border border-hairline bg-white p-5 shadow-ambient md:p-7"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="ma-giam-gia-title" className="font-display text-xl text-deep-blue">
            {s.title}
          </h2>
          <p className="mt-1 text-[12.5px] text-charcoal/60">{s.hint}</p>
        </div>
        <Button as={Link} href={`/vouchers/new?su-kien=${eventId}`} variant="secondary" size="sm">
          <FiPlus aria-hidden="true" size={14} />
          {s.create}
        </Button>
      </div>
      {vouchers.length === 0 ? (
        <p className="text-[13px] text-charcoal/60">{s.empty}</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {vouchers.map((voucher) => (
            <li key={voucher.id} className="flex flex-wrap justify-between gap-3 py-3 text-[13px]">
              <span>
                <Link
                  href={`/vouchers/${voucher.id}`}
                  className="font-mono font-semibold tracking-wider text-deep-blue hover:text-emerald-ink"
                >
                  {voucher.code}
                </Link>
                <span className="ml-2 text-charcoal/70">
                  {t.scope[voucher.scope]} · {discountText(voucher)}
                </span>
              </span>
              <span className="text-[12px] text-charcoal/60">
                {t.status[voucher.status]} ·{" "}
                {t.summary.uses(voucher.used, voucher.held, voucher.totalUses)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
