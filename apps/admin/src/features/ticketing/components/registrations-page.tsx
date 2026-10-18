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
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-deep-blue/70 hover:text-deep-blue"
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
        <div className="overflow-x-auto rounded-3xl border border-hairline bg-white">
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
