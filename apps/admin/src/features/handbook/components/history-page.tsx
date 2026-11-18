"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiRotateCcw } from "react-icons/fi";

import type { HandbookOverview, HandbookVersionSummary } from "@lavieco/shared/content";
import { CheckboxField, cn, useToast } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { restoreVersion } from "../actions/handbook";
import { TEXT } from "../constants/text";
import type { HandbookAbilities, HandbookFailure } from "../types";
import { HandbookHeader } from "./handbook-header";
import { NotePanel } from "./note-panel";

const h = TEXT.vi.history;
const date = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

function statusOf(version: HandbookVersionSummary) {
  if (version.status === "archived" && version.publishedAt === null) return "discarded" as const;
  return version.status;
}

const BADGE: Record<ReturnType<typeof statusOf>, string> = {
  draft: "bg-canary text-charcoal",
  published: "bg-emerald-brand text-charcoal",
  archived: "bg-paper text-charcoal",
  discarded: "bg-soft-white text-charcoal/70 ring-1 ring-hairline",
};

/** `/handbook/history`: every version, newest first, with "Khôi phục" (D1). */
export function HandbookHistoryPage({
  overview,
  abilities,
}: {
  overview: HandbookOverview;
  abilities: HandbookAbilities;
}) {
  const router = useRouter();
  const toast = useToast();
  const [restoring, setRestoring] = useState<number | null>(null);
  const [discard, setDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDraft = overview.draft !== null;

  const restore = async (note: string) => {
    if (restoring === null) return;
    if (hasDraft && !discard) {
      setError(h.draftWarning);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await callAction(() =>
      restoreVersion({ number: restoring, note, discardDraft: hasDraft && discard }),
    );
    setBusy(false);
    if (result.status === "ok") {
      toast({ tone: "success", message: h.restored(result.data.version.number) });
      setRestoring(null);
      router.refresh();
      return;
    }
    const reason = (
      result.reason in TEXT.vi.errors ? result.reason : "unavailable"
    ) as HandbookFailure;
    setError(TEXT.vi.errors[reason]);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <HandbookHeader
        current="history"
        draftNumber={overview.draft?.number ?? null}
        publishedNumber={overview.publishedNumber}
      />
      <section className="space-y-4">
        <h2 className="font-display text-2xl text-deep-blue">{h.heading}</h2>
        <p className="max-w-3xl text-[14px] text-charcoal/75">{h.intro}</p>

        {restoring !== null ? (
          <NotePanel
            heading={h.restoreHeading(restoring)}
            body={h.restoreBody}
            confirmLabel={h.restore}
            warning={hasDraft ? h.draftWarning : null}
            busy={busy}
            error={error}
            extra={
              hasDraft ? (
                <CheckboxField
                  tone="light"
                  label={h.discardDraft}
                  checked={discard}
                  onChange={(event) => setDiscard(event.target.checked)}
                />
              ) : null
            }
            onConfirm={(note) => void restore(note)}
            onCancel={() => {
              setRestoring(null);
              setError(null);
            }}
          />
        ) : null}

        {overview.versions.length === 0 ? (
          <p className="text-[14px] text-charcoal/70">{h.empty}</p>
        ) : (
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overview.versions.map((version) => {
              const status = statusOf(version);
              return (
                <li
                  key={version.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-3xl border bg-white p-5",
                    status === "published" ? "border-emerald-brand" : "border-hairline",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-2xl text-deep-blue">v{version.number}</span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
                        BADGE[status],
                      )}
                    >
                      {h.statuses[status]}
                    </span>
                  </div>
                  <p className="text-[14px] text-charcoal/85">{version.note || "—"}</p>
                  <div className="mt-auto space-y-1 text-[12.5px] text-charcoal/70">
                    <p>
                      {date.format(new Date(version.publishedAt ?? version.createdAt))} ·{" "}
                      {h.by((version.publishedBy ?? version.createdBy).name)}
                    </p>
                    <p>{h.pages(version.pageCount)}</p>
                  </div>
                  {abilities.publish && status === "archived" ? (
                    version.restorable ? (
                      <button
                        type="button"
                        onClick={() => {
                          setRestoring(version.number);
                          setDiscard(false);
                          setError(null);
                        }}
                        className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-hairline px-4 text-[13px] font-semibold text-deep-blue hover:bg-mint-mist"
                      >
                        <FiRotateCcw aria-hidden="true" size={14} />
                        {h.restore}
                      </button>
                    ) : (
                      <p className="text-[12.5px] text-charcoal/60">{h.notRestorable}</p>
                    )
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
