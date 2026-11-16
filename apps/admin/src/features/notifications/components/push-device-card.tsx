"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { FiBell, FiBellOff, FiSend } from "react-icons/fi";

import { Button, FormAlert } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";
import { isIosDevice, isStandalone } from "@/shared/standalone";

import { sendTestPush, subscribePush, unsubscribePush } from "../actions/push";
import { TEXT } from "../constants/text";
import type { NotificationsFailure } from "../types";

/** What this browser can do, decided once on the client (the server render says nothing). */
type Support = "server" | "unsupported" | "ios_install" | "supported";

function support(): Support {
  if (isIosDevice() && !isStandalone()) return "ios_install";
  const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return ok ? "supported" : "unsupported";
}

const noSubscription = () => () => undefined;

/** `applicationServerKey` wants bytes; the server hands out base64url. */
function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

/** The worker exists in production builds only; its subscription says whether alerts are on. */
async function readDevice(): Promise<DeviceState> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return { kind: "no_worker" };
    const subscription = await registration.pushManager.getSubscription();
    return subscription
      ? { kind: "on", registration, subscription }
      : { kind: "off", registration };
  } catch {
    return { kind: "no_worker" };
  }
}

type DeviceState =
  | { kind: "loading" }
  | { kind: "no_worker" }
  | { kind: "off"; registration: ServiceWorkerRegistration }
  | { kind: "on"; registration: ServiceWorkerRegistration; subscription: PushSubscription };

/**
 * "Máy này": turn alerts on or off for this browser and send a test. Subscribing asks
 * the browser first (it must follow a tap on iOS), then registers with identity-service.
 */
export function PushDeviceCard({
  available,
  vapidPublicKey,
}: {
  available: boolean;
  vapidPublicKey: string | null;
}) {
  const t = TEXT.vi;
  const where = useSyncExternalStore<Support>(noSubscription, support, () => "server");
  const [device, setDevice] = useState<DeviceState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (where !== "supported") return;
    let cancelled = false;
    void readDevice().then((state) => {
      if (cancelled) return;
      setDevice(state);
      setDenied(Notification.permission === "denied");
    });
    return () => {
      cancelled = true;
    };
  }, [where]);

  const fail = (reason: NotificationsFailure | "invalid", ref?: string) =>
    setError(`${t.errors[reason]}${ref ? ` (${ref})` : ""}`);

  const enable = async () => {
    if (device.kind !== "off" || !vapidPublicKey) return;
    setError(null);
    setNotice(null);
    // First thing after the tap: iOS refuses a permission prompt that is not.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setDenied(permission === "denied");
      return;
    }
    setBusy(true);
    let subscription: PushSubscription;
    try {
      subscription = await device.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(vapidPublicKey),
      });
    } catch {
      setBusy(false);
      return fail("subscribe_failed");
    }
    const result = await callAction(() => subscribePush(subscription.toJSON()));
    setBusy(false);
    if (result.status === "ok") {
      setDevice({ kind: "on", registration: device.registration, subscription });
      return;
    }
    // The server did not keep it: do not leave a subscription nobody sends to.
    await subscription.unsubscribe().catch(() => false);
    if (result.status === "invalid") fail("invalid");
    else fail(result.reason, "ref" in result ? result.ref : undefined);
  };

  const disable = async () => {
    if (device.kind !== "on") return;
    setError(null);
    setNotice(null);
    setBusy(true);
    const endpoint = device.subscription.endpoint;
    await device.subscription.unsubscribe().catch(() => false);
    const result = await callAction(() => unsubscribePush({ endpoint }));
    setBusy(false);
    setDevice({ kind: "off", registration: device.registration });
    if (result.status === "error") fail(result.reason, "ref" in result ? result.ref : undefined);
  };

  const test = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    const result = await callAction(() => sendTestPush());
    setBusy(false);
    if (result.status === "ok") setNotice(t.device.testSent(result.data.sent));
    else if (result.status === "invalid") fail("invalid");
    else fail(result.reason, "ref" in result ? result.ref : undefined);
  };

  const hint = !available
    ? t.hints.unavailable
    : where === "unsupported"
      ? t.hints.unsupported
      : where === "ios_install"
        ? t.hints.iosInstall
        : device.kind === "no_worker"
          ? t.hints.dev
          : denied
            ? t.hints.denied
            : null;

  return (
    <section className="space-y-4 rounded-3xl border border-hairline bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint-mist text-deep-blue">
          {device.kind === "on" ? (
            <FiBell aria-hidden="true" size={18} />
          ) : (
            <FiBellOff aria-hidden="true" size={18} />
          )}
        </span>
        <div>
          <h2 className="font-display text-xl text-deep-blue">{t.device.heading}</h2>
          <p className="text-[14.5px] text-charcoal/75" aria-live="polite">
            {device.kind === "on" ? t.device.on : t.device.off}
          </p>
        </div>
      </div>

      {hint ? (
        <p className="rounded-2xl bg-mint-mist p-4 text-[14px] text-deep-blue">{hint}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {device.kind === "on" ? (
          <>
            <Button
              type="button"
              variant="deep"
              className="min-h-11"
              disabled={busy}
              onClick={test}
            >
              <FiSend aria-hidden="true" size={16} />
              {busy ? t.device.working : t.device.test}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={busy}
              onClick={disable}
            >
              {t.device.disable}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            className="min-h-11"
            disabled={busy || device.kind !== "off" || !available || denied}
            onClick={enable}
          >
            <FiBell aria-hidden="true" size={16} />
            {busy ? t.device.working : t.device.enable}
          </Button>
        )}
      </div>

      {notice ? (
        <p role="status" className="text-[14px] text-emerald-ink">
          {notice}
        </p>
      ) : null}
      <FormAlert message={error} />
    </section>
  );
}
