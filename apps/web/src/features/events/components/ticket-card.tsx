"use client";

import Link from "next/link";
import { useId, useState } from "react";
import {
  FiArrowRight,
  FiCalendar,
  FiMail,
  FiMinus,
  FiPlus,
  FiSearch,
  FiShare2,
} from "react-icons/fi";

import type {
  PublicEventState,
  PublicPriceRange,
  PublicTicketType,
  RegistrationBlocker,
} from "@lavieco/shared/events";
import { cn } from "@lavieco/ui";

import { SIGN_IN_PATH, TICKET_LOOKUP_PATH, checkoutPath, eventPath } from "../constants/config";
import { TEXT } from "../constants/text";
import { formatShortDate, formatVnd, priceText } from "../utils/format";

type TicketCardProps = {
  slug: string;
  title: string;
  state: PublicEventState;
  ticketTypes: PublicTicketType[];
  price: PublicPriceRange | null;
  /** Registration open now and not a preview: the main button leads to the checkout. */
  bookable: boolean;
  blocker: RegistrationBlocker | null;
  signedIn: boolean;
  pageUrl: string;
  calendarHref: string;
};

const t = TEXT.vi.ticket;

/** Why the main button is disabled: the state first, then the service's reason. */
function blockedLabel(state: PublicEventState, blocker: RegistrationBlocker | null) {
  if (state !== "open" && state !== "few_left") return t.blocked[state];
  return blocker ? t.blockers[blocker] : t.blocked.closed;
}

/** At most this many seats can be picked: the per-order cap, and the seats left if known. */
const maxOf = (ticket: PublicTicketType) =>
  Math.max(1, Math.min(ticket.maxPerOrder, ticket.availability.seatsLeft ?? ticket.maxPerOrder));

/**
 * The ONE ticket box of the event page (sticky on large screens, a bar at the bottom
 * on phones). It only prepares the choice: the checkout keeps the existing flow (no
 * account needed, email + phone, email OTP, QR tickets by email, payOS) and validates
 * the ticket type and quantity again, as does program-service.
 */
export function TicketCard(props: TicketCardProps) {
  const { slug, title, state, ticketTypes, price, bookable, blocker, signedIn } = props;
  const groupId = useId();
  const firstOpen = ticketTypes.find((ticket) => !ticket.availability.soldOut);
  const [selectedId, setSelectedId] = useState(firstOpen?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const selected = ticketTypes.find((ticket) => ticket.id === selectedId) ?? null;
  const max = selected ? maxOf(selected) : 1;
  const count = Math.min(quantity, max);
  const total = selected ? selected.price * count : 0;
  const allFree = price?.max === 0;
  const canBook = bookable && selected !== null;
  const href = selected
    ? checkoutPath(slug, { ticketTypeId: selected.id, quantity: count })
    : checkoutPath(slug);
  const mainLabel = allFree ? t.registerFree : t.register;
  const priceLine = priceText(price, { free: t.free, from: TEXT.vi.card.priceFrom });

  const share = async () => {
    setShareNote(null);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url: props.pageUrl });
        return;
      }
      await navigator.clipboard.writeText(props.pageUrl);
      setShareNote(t.copied);
    } catch {
      // Closing the share sheet is not an error worth showing.
    }
  };

  const mainButton = (className?: string) =>
    canBook ? (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full bg-emerald-brand px-6 py-3 text-sm font-bold text-charcoal shadow-emerald-cta transition-transform hover:scale-[1.02] motion-reduce:transition-none",
          className,
        )}
      >
        {mainLabel}
        <FiArrowRight aria-hidden="true" size={15} />
      </Link>
    ) : (
      <button
        type="button"
        disabled
        className={cn(
          "cursor-not-allowed rounded-full bg-charcoal/10 px-6 py-3 text-sm font-semibold text-charcoal/70",
          className,
        )}
      >
        {blockedLabel(state, blocker)}
      </button>
    );

  return (
    <>
      <section
        id="dat-ve"
        aria-labelledby={`${groupId}-title`}
        className="scroll-mt-28 rounded-pedestal border border-hairline bg-white p-6 shadow-gallery"
      >
        <h2 id={`${groupId}-title`} className="font-display text-headline-sm text-deep-blue">
          {t.title}
        </h2>
        {priceLine ? (
          <p className="mt-1 font-display text-2xl text-deep-blue">{priceLine}</p>
        ) : null}

        {ticketTypes.length > 0 ? (
          <fieldset className="mt-5">
            <legend className="mb-2 text-label-caps uppercase text-charcoal/70">
              {t.ticketType}
            </legend>
            <div className="space-y-2">
              {ticketTypes.map((ticket) => {
                const soldOut = ticket.availability.soldOut;
                const window = t.saleWindow(
                  ticket.saleStartAt ? formatShortDate(ticket.saleStartAt) : null,
                  ticket.saleEndAt ? formatShortDate(ticket.saleEndAt) : null,
                );
                return (
                  <label
                    key={ticket.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors motion-reduce:transition-none",
                      selectedId === ticket.id
                        ? "border-emerald-brand bg-mint-mist"
                        : "border-hairline hover:bg-soft-white",
                      soldOut && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <input
                      type="radio"
                      name={`${groupId}-ticket`}
                      value={ticket.id}
                      checked={selectedId === ticket.id}
                      disabled={soldOut || !bookable}
                      onChange={() => {
                        setSelectedId(ticket.id);
                        setQuantity(1);
                      }}
                      className="mt-1 accent-emerald-brand"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-deep-blue">{ticket.name}</span>
                        <span className="shrink-0 font-display text-deep-blue">
                          {ticket.price === 0 ? t.free : formatVnd(ticket.price)}
                        </span>
                      </span>
                      {ticket.description ? (
                        <span className="mt-0.5 block text-body-sm text-charcoal/70">
                          {ticket.description}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-meta text-charcoal/60">
                        {soldOut
                          ? t.soldOutType
                          : ticket.availability.seatsLeft
                            ? TEXT.vi.card.seatsLeft(ticket.availability.seatsLeft)
                            : window || t.perOrder(ticket.maxPerOrder)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {canBook && selected ? (
          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-label-caps uppercase text-charcoal/70" id={`${groupId}-qty`}>
              {t.quantity}
            </p>
            <div
              role="group"
              aria-labelledby={`${groupId}-qty`}
              className="flex items-center gap-1 rounded-full border border-hairline p-1"
            >
              <button
                type="button"
                aria-label={t.decrease}
                disabled={count <= 1}
                onClick={() => setQuantity(Math.max(1, count - 1))}
                className="flex size-9 items-center justify-center rounded-full text-deep-blue hover:bg-mint-mist disabled:opacity-40"
              >
                <FiMinus aria-hidden="true" size={14} />
              </button>
              <output aria-live="polite" className="w-8 text-center font-semibold text-deep-blue">
                {count}
              </output>
              <button
                type="button"
                aria-label={t.increase}
                disabled={count >= max}
                onClick={() => setQuantity(Math.min(max, count + 1))}
                className="flex size-9 items-center justify-center rounded-full text-deep-blue hover:bg-mint-mist disabled:opacity-40"
              >
                <FiPlus aria-hidden="true" size={14} />
              </button>
            </div>
          </div>
        ) : null}
        {canBook && selected ? (
          <p className="mt-1 text-right text-meta text-charcoal/60">
            {t.perOrder(selected.maxPerOrder)}
          </p>
        ) : null}

        {canBook ? (
          <div className="mt-5 flex items-baseline justify-between border-t border-hairline pt-4">
            <span className="text-body-sm text-charcoal/75">{t.total}</span>
            <span className="font-display text-2xl text-deep-blue">
              {total === 0 ? t.free : formatVnd(total)}
            </span>
          </div>
        ) : null}

        {mainButton("mt-5 w-full")}

        <p className="mt-4 flex items-start gap-2 text-body-sm text-charcoal/75">
          <FiMail aria-hidden="true" size={14} className="mt-1 shrink-0 text-emerald-ink" />
          {t.qrNote}
        </p>
        {!signedIn && bookable ? (
          <p className="mt-2 text-body-sm text-charcoal/75">
            {t.noAccount}{" "}
            <Link
              href={`${SIGN_IN_PATH}?tiep=${encodeURIComponent(eventPath(slug))}`}
              className="font-semibold text-emerald-ink underline-offset-4 hover:underline"
            >
              {t.signIn}
            </Link>
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-hairline pt-4">
          <a
            href={props.calendarHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-body-sm text-deep-blue hover:bg-mint-mist"
          >
            <FiCalendar aria-hidden="true" size={13} />
            {t.addToCalendar}
          </a>
          <button
            type="button"
            onClick={share}
            className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-body-sm text-deep-blue hover:bg-mint-mist"
          >
            <FiShare2 aria-hidden="true" size={13} />
            {t.share}
          </button>
          <Link
            href={TICKET_LOOKUP_PATH}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-sm text-deep-blue underline-offset-4 hover:underline"
          >
            <FiSearch aria-hidden="true" size={13} />
            {t.lookup}
          </Link>
        </div>
        <p aria-live="polite" className="mt-2 min-h-5 text-meta text-emerald-ink">
          {shareNote}
        </p>
      </section>

      {/* Phones: the same booking as a bar at the bottom of the screen. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-white/95 px-4 py-3 shadow-dock backdrop-blur lg:hidden print:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <p className="min-w-0">
            <span className="block text-meta uppercase text-charcoal/60">{t.mobileFrom}</span>
            <span className="block truncate font-display text-lg text-deep-blue">
              {priceLine ?? blockedLabel(state, blocker)}
            </span>
          </p>
          {canBook && ticketTypes.length > 1 ? (
            <a
              href="#dat-ve"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-brand px-5 py-2.5 text-sm font-bold text-charcoal"
            >
              {mainLabel}
            </a>
          ) : (
            mainButton("shrink-0 px-5 py-2.5")
          )}
        </div>
      </div>
    </>
  );
}
