"use client";

import { useState } from "react";
import { FiChevronDown, FiChevronUp, FiEye, FiRefreshCw } from "react-icons/fi";

import type { EventStatus } from "@lavieco/shared/events";

import { TEXT } from "../constants/text";

const t = TEXT.vi.preview;

/** The small floating note that this is not the public page, collapsible to read it all. */
export function PreviewBar({
  status,
  refreshHref,
}: {
  status: EventStatus;
  /** The admin route that mints a new token; null when the admin origin is not configured. */
  refreshHref: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label={t.expand}
        className="fixed right-4 top-4 z-50 flex items-center gap-1.5 rounded-full bg-deep-blue px-3 py-2 text-meta font-semibold uppercase text-soft-white shadow-gallery print:hidden"
      >
        <FiEye aria-hidden="true" size={14} />
        <FiChevronDown aria-hidden="true" size={14} />
      </button>
    );
  }
  return (
    <div
      role="note"
      className="fixed inset-x-3 top-3 z-50 mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl bg-deep-blue px-4 py-2 text-body-sm text-soft-white shadow-gallery print:hidden"
    >
      <p className="flex items-center gap-2 font-semibold">
        <FiEye aria-hidden="true" size={14} />
        {t.banner} · {t.notPublic} · {t.status[status]}
      </p>
      <div className="flex items-center gap-1">
        {refreshHref ? (
          <a
            href={refreshHref}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium hover:bg-soft-white/10"
          >
            <FiRefreshCw aria-hidden="true" size={13} />
            {t.refresh}
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium hover:bg-soft-white/10"
        >
          <FiChevronUp aria-hidden="true" size={13} />
          {t.collapse}
        </button>
      </div>
    </div>
  );
}
