import Link from "next/link";
import { FiArrowLeft, FiCamera } from "react-icons/fi";

import { orderDisplayStatus, type EventView, type RegistrationList } from "@lavieco/shared/events";
import type { StaffProfile } from "@lavieco/shared/identity";
import { can } from "@lavieco/shared/permissions";
import { Button, CheckboxField, TextField } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import { formatDateTime } from "../utils/format";
import { ExportPanel } from "./export-panel";
import { OrderStatusBadge } from "./order-status-badge";
import { PageHeader } from "./page-header";

type RegistrationsPageProps = {
  event: EventView;
  list: RegistrationList;
  staff: StaffProfile;
  query: { q?: string; includeRefunded: boolean };
};

/** `/events/[id]/registrations` (`order:read`): one row per ticket, a column per question. */
export function RegistrationsPage({ event, list, staff, query }: RegistrationsPageProps) {
  const t = TEXT.vi.registrations;
  const base = `/events/${event.id}/registrations`;
  const nextHref = (cursor: string) => {
    const params = new URLSearchParams({ cursor });
    if (query.q) params.set("q", query.q);
    if (query.includeRefunded) params.set("includeRefunded", "true");
    return `${base}?${params.toString()}`;
  };
  return (
    <>
      <PageHeader
        back={
          <Link
            href={`/events/${event.id}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-deep-blue/70 hover:text-deep-blue md:min-h-0"
          >
            <FiArrowLeft aria-hidden="true" size={14} />
            {t.back}
          </Link>
        }
        eyebrow={t.eyebrow}
        title={event.title}
        intro={t.intro}
        actions={
          <>
            {can(staff, "checkin:perform") ? (
              <Button as={Link} href={`/checkin/${event.id}`} variant="secondary" size="sm">
                <FiCamera aria-hidden="true" size={14} />
                {t.checkin}
              </Button>
            ) : null}
            {can(staff, "registration:export") ? <ExportPanel eventId={event.id} /> : null}
          </>
        }
      />

      <form
        method="get"
        action={base}
        className="mb-6 flex flex-wrap items-end gap-4 rounded-3xl border border-hairline bg-white p-5"
      >
        <TextField
          tone="light"
          name="q"
          label={t.search}
          defaultValue={query.q ?? ""}
          wrapperClassName="min-w-64 flex-1"
        />
        <CheckboxField
          tone="light"
          name="includeRefunded"
          value="true"
          label={t.includeRefunded}
          defaultChecked={query.includeRefunded}
        />
        <Button type="submit" variant="deep" size="sm" className="h-10.5 px-5">
          {t.apply}
        </Button>
      </form>

      {list.items.length === 0 ? (
        <p className="rounded-3xl border border-hairline bg-white p-8 text-center text-[14px] text-charcoal/65">
          {t.empty}
        </p>
      ) : (
        <>
          {/* Phones: one card per ticket; form answers stay in the table and the export. */}
          <ul className="space-y-3 md:hidden">
            {list.items.map((row, index) => (
              <li key={row.ticketCode} className="rounded-3xl border border-hairline bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-deep-blue">
                      <span className="mr-2 font-normal text-charcoal/50">{index + 1}.</span>
                      {row.buyer.fullName}
                    </p>
                    <p className="mt-0.5 text-[13px] text-charcoal/70">{row.ticketTypeName}</p>
                  </div>
                  <OrderStatusBadge
                    status={orderDisplayStatus({
                      status: row.orderStatus,
                      amount: row.orderAmount,
                    })}
                  />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-hairline pt-3 text-[13px]">
                  <div>
                    <dt className="text-[11px] uppercase tracking-museum text-deep-blue/55">
                      {t.columns.ticketCode}
                    </dt>
                    <dd className="font-semibold tracking-wider text-deep-blue">
                      {row.ticketCode}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-museum text-deep-blue/55">
                      {t.columns.checkin}
                    </dt>
                    <dd className="text-charcoal/80">
                      {row.checkedInAt
                        ? formatDateTime(row.checkedInAt)
                        : TEXT.vi.ticketStatus[row.ticketStatus]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-museum text-deep-blue/55">
                      {t.columns.phone}
                    </dt>
                    <dd>
                      <a
                        href={`tel:${row.buyer.phone}`}
                        className="inline-flex min-h-11 items-center text-deep-blue underline-offset-4 hover:underline"
                      >
                        {row.buyer.phone}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-museum text-deep-blue/55">
                      {t.columns.orderCode}
                    </dt>
                    <dd>
                      <Link
                        href={`/orders/${row.orderId}`}
                        className="inline-flex min-h-11 items-center text-deep-blue underline-offset-4 hover:underline"
                      >
                        {row.orderCode}
                      </Link>
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <div className="relative hidden overflow-x-auto rounded-3xl border border-hairline bg-white md:block">
            <table className="w-full min-w-[64rem] text-left text-[13px]">
              <thead className="border-b border-hairline text-[11px] uppercase tracking-museum text-deep-blue/60">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.columns.index}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.columns.buyer}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.columns.phone}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.columns.ticketType}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.columns.ticketCode}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.columns.orderCode}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.columns.payment}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.columns.checkin}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.columns.registeredAt}
                  </th>
                  {list.columns.map((column) => (
                    <th
                      key={column.questionId}
                      scope="col"
                      className="max-w-56 px-4 py-3 font-semibold normal-case tracking-normal"
                    >
                      {column.label} {column.hidden ? t.hidden : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {list.items.map((row, index) => (
                  <tr key={row.ticketCode} className="align-top">
                    <td className="px-4 py-3 text-charcoal/60">{index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="text-deep-blue">{row.buyer.fullName}</p>
                      <p className="break-all text-[12px] text-charcoal/60">{row.buyer.email}</p>
                    </td>
                    <td className="px-4 py-3 text-charcoal/80">{row.buyer.phone}</td>
                    <td className="px-4 py-3 text-charcoal/80">{row.ticketTypeName}</td>
                    <td className="px-4 py-3 font-semibold tracking-wider text-deep-blue">
                      {row.ticketCode}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${row.orderId}`}
                        className="text-deep-blue underline-offset-4 hover:underline"
                      >
                        {row.orderCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge
                        status={orderDisplayStatus({
                          status: row.orderStatus,
                          amount: row.orderAmount,
                        })}
                      />
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-charcoal/75">
                      {row.checkedInAt
                        ? formatDateTime(row.checkedInAt)
                        : TEXT.vi.ticketStatus[row.ticketStatus]}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-charcoal/70">
                      {formatDateTime(row.registeredAt)}
                    </td>
                    {list.columns.map((column) => (
                      <td
                        key={column.questionId}
                        className="max-w-56 whitespace-pre-line px-4 py-3 text-charcoal/80"
                      >
                        {row.answers[column.questionId] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {list.nextCursor ? (
        <div className="mt-6 text-right">
          <Button as={Link} href={nextHref(list.nextCursor)} variant="secondary" size="sm">
            {t.next}
          </Button>
        </div>
      ) : null}
    </>
  );
}
