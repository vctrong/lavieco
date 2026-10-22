"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FiAlertTriangle,
  FiCamera,
  FiCheckCircle,
  FiCopy,
  FiEye,
  FiInfo,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";

import type { EventAction, EventView } from "@lavieco/shared/events";
import { Button, cn, FormAlert } from "@lavieco/ui";

import {
  approveAttendance,
  changeEventStatus,
  discardEvent,
  duplicateEvent,
} from "../actions/events";
import { TEXT } from "../constants/text";
import type { ActionResult } from "../types";
import { formatDateTime } from "../utils/format";
import { CancelEventPanel, canCancel } from "./cancel-event-panel";
import { StatusBadge } from "./status-badge";
import { callAction } from "@/shared/call-action";
import { failureText } from "../utils/failure-text";

type PanelAction = EventAction | "duplicate" | "discard";

/** Status changes offered for the current status (the service decides in the end). */
function actionsFor(event: EventView): PanelAction[] {
  const past = event.kind === "past";
  switch (event.status) {
    case "draft":
      return ["publish", ...(event.slugLocked ? [] : (["discard"] as const)), "duplicate"];
    case "published":
      return ["close", "end", "unpublish", "duplicate"];
    case "closed":
      return ["reopen", "end", "unpublish", "duplicate"];
    case "ended":
      return past ? ["unpublish", "duplicate"] : ["duplicate"];
    case "cancelled":
      return ["duplicate"];
  }
}

function Readiness({ event }: { event: EventView }) {
  const t = TEXT.vi.readiness;
  const { blockers, warnings } = event.readiness;
  return (
    <div className="rounded-2xl bg-soft-white p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-museum text-deep-blue/70">
        {t.title}
      </p>
      <ul className="space-y-2 text-[12.5px] leading-relaxed">
        {blockers.length === 0 ? (
          <li className="flex items-start gap-2 text-deep-blue">
            <FiCheckCircle
              aria-hidden="true"
              size={14}
              className="mt-0.5 shrink-0 text-emerald-brand"
            />
            {t.ready}
          </li>
        ) : null}
        {blockers.map((blocker) => (
          <li key={blocker} className="flex items-start gap-2 text-deep-blue">
            <FiXCircle aria-hidden="true" size={14} className="mt-0.5 shrink-0 text-deep-blue/60" />
            {t.blockers[blocker]}
          </li>
        ))}
        {warnings.map((warning) => (
          <li key={warning} className="flex items-start gap-2 text-charcoal/75">
            <FiAlertTriangle
              aria-hidden="true"
              size={14}
              className="mt-0.5 shrink-0 text-deep-blue/50"
            />
            {t.warnings[warning]}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Side panel: status, publishing checklist and lifecycle buttons with an inline
 * confirmation (no browser dialogs). No second reviewer is needed (BR-17).
 */
export function StatusPanel({
  event,
  canWrite,
  canApprove,
  dirty,
}: {
  event: EventView;
  canWrite: boolean;
  /** `impact:approve`: may publish a typed attendance (BR-09). */
  canApprove: boolean;
  dirty: boolean;
}) {
  const t = TEXT.vi;
  const router = useRouter();
  const [pending, setPending] = useState<PanelAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  const label = (action: PanelAction) =>
    action === "publish" && event.kind === "past" ? t.actions.publishPast : t.actions[action];

  const run = async (action: PanelAction) => {
    setBusy(true);
    setAlert(null);
    const result = await callAction<ActionResult<unknown>>(() =>
      action === "duplicate"
        ? duplicateEvent(event.id)
        : action === "discard"
          ? discardEvent(event.id, { revision: event.revision })
          : changeEventStatus(event.id, { action, revision: event.revision }),
    );
    setBusy(false);
    setPending(null);
    if (result.status === "ok") {
      if (action === "duplicate") {
        router.push(`/events/${(result.data as { id: string }).id}`);
      } else if (action === "discard") {
        router.push("/events");
      } else {
        router.refresh();
      }
      return;
    }
    setAlert(result.status === "error" ? failureText(result) : t.errors.invalid);
  };

  const approve = async () => {
    setBusy(true);
    setAlert(null);
    const result = await callAction(() =>
      approveAttendance(event.id, { revision: event.revision }),
    );
    setBusy(false);
    if (result.status === "ok") {
      router.refresh();
      return;
    }
    setAlert(result.status === "error" ? failureText(result) : t.errors.invalid);
  };
  const awaitingApproval =
    event.kind === "past" && event.attendance.count !== null && !event.attendance.approvedAt;

  const actions = actionsFor(event);
  const blocked = (action: PanelAction) =>
    (action === "publish" && event.readiness.blockers.length > 0) ||
    (action === "unpublish" && event.kind === "standard" && event.hasRegistrations) ||
    (action !== "duplicate" && dirty);

  return (
    <aside
      aria-label={t.actions.title}
      className="space-y-4 rounded-3xl border border-hairline bg-white p-5 shadow-ambient"
    >
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={event.status} />
        <Link
          href={`/events/${event.id}/preview`}
          className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-deep-blue hover:bg-mint-mist"
        >
          <FiEye aria-hidden="true" size={13} />
          {t.actions.preview}
        </Link>
      </div>
      {event.cancellation ? (
        <p className="rounded-2xl bg-soft-white p-4 text-[12.5px] leading-relaxed text-charcoal/80">
          <span className="block font-semibold text-deep-blue">
            {t.actions.cancelled(formatDateTime(event.cancellation.at))}
          </span>
          {event.cancellation.reason}
        </p>
      ) : (
        <Readiness event={event} />
      )}
      {event.kind === "standard" && event.status !== "draft" ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/events/${event.id}/registrations`}
            className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-deep-blue hover:bg-mint-mist"
          >
            <FiUsers aria-hidden="true" size={13} />
            {t.actions.registrations}
          </Link>
          <Link
            href={`/checkin/${event.id}`}
            className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-deep-blue hover:bg-mint-mist"
          >
            <FiCamera aria-hidden="true" size={13} />
            {t.actions.checkin}
          </Link>
        </div>
      ) : null}
      {canWrite ? (
        <div className="space-y-2">
          {dirty ? (
            <p className="flex items-start gap-2 text-[12px] text-deep-blue/75">
              <FiInfo aria-hidden="true" size={13} className="mt-0.5 shrink-0" />
              {t.actions.saveFirst}
            </p>
          ) : null}
          {event.kind === "standard" && event.hasRegistrations ? (
            <p className="text-[12px] text-deep-blue/70">{t.actions.registrationsLock}</p>
          ) : null}
          {actions.map((action) =>
            pending === action ? (
              <div
                key={action}
                className="rounded-2xl border border-emerald-brand/40 bg-mint-mist p-3"
              >
                <p className="mb-3 text-[12.5px] leading-relaxed text-deep-blue">
                  {t.actions.confirm[action]}
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" disabled={busy} onClick={() => run(action)}>
                    {busy ? t.editor.saving : t.actions.yes}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setPending(null)}
                  >
                    {t.actions.no}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                key={action}
                type="button"
                size="sm"
                variant={action === "publish" ? "primary" : "secondary"}
                disabled={busy || pending !== null || blocked(action)}
                onClick={() => setPending(action)}
                className={cn("w-full disabled:cursor-not-allowed disabled:opacity-50")}
              >
                {action === "duplicate" ? <FiCopy aria-hidden="true" size={13} /> : null}
                {label(action)}
              </Button>
            ),
          )}
          {canCancel(event) ? <CancelEventPanel event={event} disabled={busy || dirty} /> : null}
          <FormAlert message={alert} />
        </div>
      ) : null}
      {canApprove && awaitingApproval ? (
        <div className="space-y-2">
          <p className="text-[12px] text-deep-blue/75">{t.editor.fields.attendancePending}</p>
          <Button
            type="button"
            size="sm"
            disabled={busy || dirty}
            onClick={approve}
            className="w-full disabled:opacity-50"
          >
            {t.actions.approveAttendance}
          </Button>
          {canWrite ? null : <FormAlert message={alert} />}
        </div>
      ) : null}
      <dl className="grid grid-cols-2 gap-2 border-t border-hairline pt-4 text-[12px] text-charcoal/65">
        <dt>{t.editor.meta.updated}</dt>
        <dd className="text-right">{formatDateTime(event.updatedAt)}</dd>
        <dt>{t.editor.meta.revision}</dt>
        <dd className="text-right">{event.revision}</dd>
      </dl>
    </aside>
  );
}
