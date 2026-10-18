import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiCircle,
  FiMapPin,
  FiRotateCcw,
  FiSlash,
  FiUser,
  FiVideo,
} from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import type { TicketState } from "../utils/ticket-state";

export type ChipTone = "valid" | "used" | "attention" | "muted";

const CHIP_TONES: Record<ChipTone, string> = {
  valid: "bg-emerald-brand/15 text-deep-blue ring-emerald-brand/40",
  used: "bg-mint-mist text-deep-blue ring-hairline",
  attention: "bg-canary/40 text-deep-blue ring-canary",
  muted: "bg-charcoal/5 text-charcoal/75 ring-hairline",
};

const CHIP_ICONS: Record<ChipTone, typeof FiCircle> = {
  valid: FiCircle,
  used: FiCheckCircle,
  attention: FiRotateCcw,
  muted: FiSlash,
};

export const STATE_TONES: Record<TicketState, ChipTone> = {
  valid: "valid",
  used: "used",
  refunded: "attention",
  cancelled: "muted",
};

/** Status pill shared by the ticket card and the lookup stubs. */
export function StatusChip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  const Icon = CHIP_ICONS[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold ring-1 ring-inset print:ring-charcoal/40",
        CHIP_TONES[tone],
      )}
    >
      <Icon
        aria-hidden="true"
        size={12}
        className={tone === "valid" ? "fill-emerald-brand text-emerald-brand" : undefined}
      />
      {children}
    </span>
  );
}

/**
 * Tear line of a ticket: a dashed rule between two half-circle notches cut in the page
 * colour. Horizontal only (stacked layouts); the wide layout uses a dashed border.
 */
export function Perforation({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("relative h-6", className)}>
      <span className="absolute -left-3 top-0 size-6 rounded-full border border-hairline bg-soft-white print:bg-white" />
      <span className="absolute inset-x-5 top-1/2 border-t border-dashed border-deep-blue/20" />
      <span className="absolute -right-3 top-0 size-6 rounded-full border border-hairline bg-soft-white print:bg-white" />
    </div>
  );
}

export type TicketCardData = {
  code: string;
  ticketTypeName: string;
  state: TicketState;
  /** Formatted check-in time when used. */
  checkedInAt: string | null;
  /** QR data URL; null when the ticket is void (never drawn, not even in print). */
  qrImage: string | null;
};

type TicketCardProps = {
  ticket: TicketCardData;
  index: number;
  total: number;
  event: { title: string; schedule: string; place: string; online: boolean };
  bookerName: string;
};

/**
 * One ticket as a pass: QR large enough to scan from a phone held out at the door, its
 * code, its state, then the event and the booker (name only: the link can be shared).
 * Stacked on phones, QR stub on the right from `md`. One ticket per printed page.
 */
export function TicketCard({ ticket, index, total, event, bookerName }: TicketCardProps) {
  const t = TEXT.vi.ticket;
  const Place = event.online ? FiVideo : FiMapPin;
  const noQr = ticket.qrImage === null;
  const stateLabel =
    ticket.state === "used" && ticket.checkedInAt
      ? t.checkedInAt(ticket.checkedInAt)
      : t.state[ticket.state];
  return (
    <article
      id={`ve-${ticket.code}`}
      aria-label={`${t.position(index, total)} · ${ticket.code}`}
      className="scroll-mt-32 overflow-hidden rounded-[28px] border border-hairline bg-white md:grid md:grid-cols-[minmax(0,1fr)_auto] print:break-inside-avoid print:rounded-2xl print:border-charcoal/30"
    >
      <div className="order-2 px-6 pb-6 md:flex md:flex-col md:justify-between md:py-7 md:pl-8 md:pr-6">
        <Perforation className="-mx-6 mb-4 md:hidden" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-museum text-deep-blue/60">
            {t.position(index, total)}
          </p>
          <h2 className="mt-1 font-display text-xl leading-snug text-deep-blue md:text-2xl">
            {event.title}
          </h2>
        </div>
        <dl className="mt-4 space-y-2.5 text-[14px] text-charcoal/85">
          <div className="flex items-start gap-3">
            <dt className="sr-only">{t.when}</dt>
            <FiCalendar
              aria-hidden="true"
              size={16}
              className="mt-0.5 shrink-0 text-emerald-brand"
            />
            <dd>{event.schedule}</dd>
          </div>
          <div className="flex items-start gap-3">
            <dt className="sr-only">{t.where}</dt>
            <Place aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-emerald-brand" />
            <dd>{event.place}</dd>
          </div>
          <div className="flex items-start gap-3">
            <dt className="sr-only">{t.bookedBy}</dt>
            <FiUser aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-emerald-brand" />
            <dd>
              <span className="text-charcoal/60">{t.bookedBy}: </span>
              <span className="font-semibold text-deep-blue">{bookerName}</span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="order-1 flex flex-col items-center gap-3 px-6 pb-4 pt-6 text-center md:order-3 md:w-80 md:border-l md:border-dashed md:border-deep-blue/20 md:py-7">
        <div className="flex w-full items-center justify-between gap-3 md:justify-center">
          <p className="font-semibold text-deep-blue md:hidden">{ticket.ticketTypeName}</p>
          <StatusChip tone={STATE_TONES[ticket.state]}>{stateLabel}</StatusChip>
        </div>
        <p className="hidden font-semibold text-deep-blue md:block">{ticket.ticketTypeName}</p>
        {ticket.qrImage === null ? (
          <div className="flex aspect-square w-full max-w-[280px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-hairline bg-soft-white text-[13px] text-charcoal/60 print:bg-white">
            <FiSlash aria-hidden="true" size={28} />
            {t.noQr}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-2 ring-1 ring-hairline">
            <Image
              src={ticket.qrImage}
              alt={t.qrAlt(ticket.code)}
              width={280}
              height={280}
              unoptimized
              className={cn(
                "size-[min(280px,70vw)] print:size-[6cm]",
                ticket.state === "used" && "opacity-40",
              )}
            />
          </div>
        )}
        <p
          className={cn(
            "font-mono text-xl font-semibold tracking-[0.2em] text-deep-blue",
            noQr && "text-charcoal/50 line-through",
          )}
        >
          {ticket.code}
        </p>
        {ticket.state === "valid" ? (
          <p className="max-w-[16rem] text-[12px] leading-relaxed text-charcoal/60 print:hidden">
            {t.brightness}
          </p>
        ) : null}
      </div>
    </article>
  );
}

type TicketStubProps = {
  href: string;
  title: string;
  date: string;
  status: { label: string; tone: ChipTone };
  ticketCount: string;
  orderCode: string;
  openLabel: string;
};

/**
 * An order in the lookup results, drawn as the same pass as the ticket page but without
 * a QR (the lookup response has none): event, date and state, then a stub that opens it.
 */
export function TicketStub({
  href,
  title,
  date,
  status,
  ticketCount,
  orderCode,
  openLabel,
}: TicketStubProps) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-[24px] border border-hairline bg-white transition-colors hover:border-deep-blue/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-brand motion-reduce:transition-none sm:grid sm:grid-cols-[minmax(0,1fr)_auto]"
    >
      <div className="space-y-2 px-5 pb-4 pt-5">
        <StatusChip tone={status.tone}>{status.label}</StatusChip>
        <p className="font-display text-lg leading-snug text-deep-blue">{title}</p>
        <p className="flex items-center gap-2 text-[13px] text-charcoal/70">
          <FiCalendar aria-hidden="true" size={14} className="shrink-0 text-emerald-brand" />
          {date}
        </p>
      </div>
      <Perforation className="-mx-px sm:hidden" />
      <div className="flex items-center justify-between gap-4 px-5 pb-5 pt-1 sm:flex-col sm:items-end sm:justify-center sm:border-l sm:border-dashed sm:border-deep-blue/20 sm:py-5">
        <div className="text-[13px] text-charcoal/70 sm:text-right">
          <p className="font-semibold text-deep-blue">{ticketCount}</p>
          <p>{orderCode}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-deep-blue group-hover:text-emerald-brand">
          {openLabel}
          <FiArrowRight aria-hidden="true" size={14} />
        </span>
      </div>
    </Link>
  );
}
