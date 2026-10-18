"use client";

import { FiPrinter } from "react-icons/fi";

import { TEXT } from "../constants/text";

/** Opens the browser's print dialog; the ticket page has its own print layout. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full border border-deep-blue/30 px-4 py-2 text-[13px] font-semibold text-deep-blue hover:border-deep-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-brand print:hidden"
    >
      <FiPrinter aria-hidden="true" size={15} />
      {TEXT.vi.ticket.print}
    </button>
  );
}
