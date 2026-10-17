import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

import type { EventView } from "@lavieco/shared/events";

import { TEXT } from "../constants/text";
import { CopyLinkButton } from "./copy-link-button";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";

/**
 * `/events/[id]/preview` (D2): the public page as `web` renders it, inside an iframe
 * fed by a 10-minute token. Sharing this admin URL keeps access behind `program:read`.
 */
export function EventPreviewPage({ event, frameUrl }: { event: EventView; frameUrl: string }) {
  const t = TEXT.vi.preview;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow={t.eyebrow}
        title={event.title}
        intro={t.intro}
        back={
          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-deep-blue/70 hover:text-deep-blue"
          >
            <FiArrowLeft aria-hidden="true" size={13} />
            {t.back}
          </Link>
        }
        actions={
          <>
            <StatusBadge status={event.status} />
            <CopyLinkButton />
          </>
        }
      />
      <div className="overflow-hidden rounded-3xl border border-hairline bg-white shadow-ambient">
        <iframe
          src={frameUrl}
          title={t.frameTitle(event.title)}
          className="h-[80dvh] w-full"
          referrerPolicy="no-referrer"
        />
      </div>
      <p className="mt-3 text-[12px] text-charcoal/60">{t.expires}</p>
    </div>
  );
}
