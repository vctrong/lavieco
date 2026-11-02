"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FiEye, FiMail, FiPause, FiPlay, FiRotateCw, FiSend, FiX } from "react-icons/fi";

import type { CampaignRendered, CampaignView } from "@lavieco/shared/events";
import { Button, FormAlert, TextField } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { moveCampaign, renderCampaign, sendCampaign, testCampaign } from "../actions/campaigns";
import { TEXT } from "../constants/text";
import { previewAudience } from "../actions/campaigns";
import type { CampaignActionResult } from "../types";

const t = TEXT.vi;
const VN_OFFSET_MS = 7 * 3_600_000;

const ACTION =
  "inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-deep-blue hover:bg-mint-mist disabled:opacity-50";

const messageOf = (
  result:
    | Exclude<CampaignActionResult<unknown>, { status: "ok" }>
    | { status: "error"; reason: "stale_version" | "offline" | "unavailable" },
) => (result.status === "error" ? t.errors[result.reason] : t.errors.invalid);

/** Pause, resume, cancel, retry, for what is on its way out. */
export function CampaignMoves({ campaign }: { campaign: CampaignView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const move = async (action: "pause" | "resume" | "cancel" | "retry-failed") => {
    setBusy(true);
    setAlert(null);
    const result = await callAction(() => moveCampaign(campaign.id, action));
    setBusy(false);
    if (result.status === "ok") router.refresh();
    else setAlert(messageOf(result));
  };
  const { status, counters } = campaign;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "sending" || status === "scheduled" ? (
          <button type="button" className={ACTION} disabled={busy} onClick={() => move("pause")}>
            <FiPause aria-hidden="true" size={13} />
            {t.actions.pause}
          </button>
        ) : null}
        {status === "paused" ? (
          <button type="button" className={ACTION} disabled={busy} onClick={() => move("resume")}>
            <FiPlay aria-hidden="true" size={13} />
            {t.actions.resume}
          </button>
        ) : null}
        {counters.failed > 0 && (status === "done" || status === "sending") ? (
          <button
            type="button"
            className={ACTION}
            disabled={busy}
            onClick={() => move("retry-failed")}
          >
            <FiRotateCw aria-hidden="true" size={13} />
            {t.actions.retry}
          </button>
        ) : null}
        {status !== "done" && status !== "cancelled" ? (
          <button type="button" className={ACTION} disabled={busy} onClick={() => move("cancel")}>
            <FiX aria-hidden="true" size={13} />
            {t.actions.cancel}
          </button>
        ) : null}
      </div>
      <FormAlert message={alert} />
    </div>
  );
}

/**
 * The email as it will look, in a sandboxed frame: `srcDoc` holds the service's own
 * rendering, and with no `allow-*` the frame can run nothing.
 */
export function CampaignPreview({ campaignId }: { campaignId: string }) {
  const [rendered, setRendered] = useState<CampaignRendered | null>(null);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const toggle = async () => {
    if (rendered) return setRendered(null);
    setBusy(true);
    setAlert(null);
    const result = await callAction(() => renderCampaign(campaignId));
    setBusy(false);
    if (result.status === "ok") setRendered(result.data);
    else setAlert(messageOf(result));
  };
  return (
    <div className="space-y-3">
      <button type="button" className={ACTION} disabled={busy} onClick={toggle}>
        <FiEye aria-hidden="true" size={13} />
        {rendered ? t.send.hide : t.send.viewEmail}
      </button>
      <FormAlert message={alert} />
      {rendered ? (
        <iframe
          title={t.send.frameTitle}
          sandbox=""
          srcDoc={rendered.html}
          className="h-[34rem] w-full rounded-2xl border border-hairline bg-white"
        />
      ) : null}
    </div>
  );
}

/** Test copy, then the real send: step-up, and the number of recipients typed back. */
export function CampaignSendPanel({ campaign }: { campaign: CampaignView }) {
  const s = t.send;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const sendTest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("testEmail") ?? "").trim();
    setBusy(true);
    setAlert(null);
    setNotice(null);
    const result = await callAction(() => testCampaign(campaign.id, { email }));
    setBusy(false);
    if (result.status === "ok") setNotice(s.testSent);
    else setAlert(messageOf(result));
  };

  const prepare = async () => {
    setBusy(true);
    setAlert(null);
    const result = await callAction(() => previewAudience(campaign.audience));
    setBusy(false);
    if (result.status === "ok") setCount(result.data.count);
    else setAlert(messageOf(result));
  };

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").trim();
    if (!/^\d{6}$/.test(code)) return setAlert(s.badCode);
    const when = String(form.get("when") ?? "");
    setBusy(true);
    setAlert(null);
    const result = await callAction(() =>
      sendCampaign(
        campaign.id,
        {
          confirmCount: Number(String(form.get("confirmCount") ?? "").trim()),
          scheduledAt: when
            ? new Date(Date.parse(`${when}:00Z`) - VN_OFFSET_MS).toISOString()
            : null,
          revision: campaign.revision,
        },
        code,
      ),
    );
    setBusy(false);
    if (result.status === "ok") {
      router.refresh();
      return;
    }
    setAlert(messageOf(result));
  };

  return (
    <section className="space-y-5 rounded-3xl border border-hairline bg-white p-5 shadow-ambient md:p-7">
      <h2 className="font-display text-xl text-deep-blue">{s.title}</h2>
      <CampaignPreview campaignId={campaign.id} />
      <form onSubmit={sendTest} className="flex flex-wrap items-end gap-3">
        <TextField
          tone="light"
          type="email"
          name="testEmail"
          label={s.testEmail}
          wrapperClassName="min-w-60 flex-1"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={busy}>
          <FiMail aria-hidden="true" size={13} />
          {s.test}
        </Button>
      </form>
      {count === null ? (
        <Button type="button" size="sm" disabled={busy} onClick={prepare}>
          <FiSend aria-hidden="true" size={13} />
          {s.confirm}
        </Button>
      ) : (
        <form onSubmit={send} className="grid gap-4 rounded-2xl bg-soft-white p-4 md:grid-cols-3">
          <TextField
            tone="light"
            name="confirmCount"
            inputMode="numeric"
            label={s.countLabel}
            hint={s.count(count)}
          />
          <TextField
            tone="light"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            label={s.code}
          />
          <TextField tone="light" name="when" type="datetime-local" label={s.when} />
          <div className="md:col-span-3">
            <Button type="submit" size="sm" disabled={busy}>
              <FiSend aria-hidden="true" size={13} />
              {busy ? s.sending : s.confirm}
            </Button>
          </div>
        </form>
      )}
      <FormAlert message={alert} />
      <FormAlert tone="success" message={notice} />
    </section>
  );
}
