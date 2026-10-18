"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { FiAlertOctagon, FiCamera, FiCameraOff, FiCheckCircle, FiClock } from "react-icons/fi";

import type { CheckinResponse, CheckinStats } from "@lavieco/shared/events";
import { Button, TextField, cn } from "@lavieco/ui";

import { checkIn } from "../actions/checkin";
import { TEXT } from "../constants/text";
import { formatTime, normaliseTicketCode } from "../utils/format";
import { FormAlert } from "./form-alert";

/** Native detector (Android Chrome, recent Safari); absent elsewhere, then jsQR decodes. */
type NativeDetector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (options: { formats: string[] }) => NativeDetector;

const QR_TOKEN = /^[A-Za-z0-9_-]{43,64}$/;
/** The same QR seen again within this window is the same scan, not a second one. */
const REPEAT_WINDOW_MS = 4_000;

function nativeDetector(): NativeDetector | null {
  const Constructor = (globalThis as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
  return Constructor ? new Constructor({ formats: ["qr_code"] }) : null;
}

/**
 * Door scanner (docs/05 §5.6), mobile first: camera with BarcodeDetector or jsQR, or a
 * typed code. Every check-in is decided by program-service with an atomic update; the
 * screen only shows valid / already used (with the first time) / invalid.
 */
export function CheckinScanner({
  eventId,
  initialStats,
}: {
  eventId: string;
  initialStats: CheckinStats;
}) {
  const t = TEXT.vi.checkin;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const lastRef = useRef<{ value: string; at: number } | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinResponse | null>(null);
  const [stats, setStats] = useState(initialStats);
  const [checking, setChecking] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | undefined>();
  const resultRef = useRef<HTMLElement>(null);

  const submit = useCallback(
    async (input: { qrToken: string } | { code: string }) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setChecking(true);
      setAlert(null);
      const response = await checkIn({ eventId, ...input }).catch(() => null);
      setChecking(false);
      if (response?.status === "ok") {
        setResult(response.data);
        setStats(response.data.stats);
      } else if (response?.status === "error") {
        setAlert(TEXT.vi.errors[response.reason]);
        busyRef.current = false;
      } else {
        setResult({ result: "invalid", ticket: null, stats });
      }
    },
    [eventId, stats],
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t.cameraUnsupported);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraError(t.cameraDenied);
    }
  };

  useEffect(() => stopCamera, [stopCamera]);

  // A code typed at the bottom of the page gets its answer above the camera: bring it
  // into view, or the door team never sees "already used".
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ block: "nearest" });
  }, [result]);

  useEffect(() => {
    if (!cameraOn) return;
    const detector = nativeDetector();
    let frame = 0;
    let cancelled = false;

    const decode = async (): Promise<string | null> => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return null;
      if (detector) {
        const codes = await detector.detect(video).catch(() => []);
        return codes[0]?.rawValue ?? null;
      }
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", { willReadFrequently: true });
      if (!canvas || !context) return null;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      return (
        jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" })?.data ??
        null
      );
    };

    const tick = async () => {
      if (cancelled) return;
      if (!busyRef.current) {
        const value = (await decode())?.trim();
        const last = lastRef.current;
        const repeated = last && last.value === value && Date.now() - last.at < REPEAT_WINDOW_MS;
        if (value && QR_TOKEN.test(value) && !repeated) {
          lastRef.current = { value, at: Date.now() };
          void submit({ qrToken: value });
        }
      }
      frame = window.setTimeout(() => void tick(), 250);
    };
    void tick();
    return () => {
      cancelled = true;
      window.clearTimeout(frame);
    };
  }, [cameraOn, submit]);

  const next = () => {
    setResult(null);
    busyRef.current = false;
  };

  const handleManual = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const code = normaliseTicketCode(String(new FormData(form).get("code") ?? ""));
    if (!code) return setManualError(t.manualInvalid);
    setManualError(undefined);
    busyRef.current = false;
    await submit({ code });
    form.reset();
  };

  const tone =
    result?.result === "valid"
      ? "border-emerald-brand bg-emerald-brand/15"
      : result?.result === "already_used"
        ? "border-canary bg-canary/30"
        : "border-deep-blue/40 bg-deep-blue/10";
  const Icon =
    result?.result === "valid"
      ? FiCheckCircle
      : result?.result === "already_used"
        ? FiClock
        : FiAlertOctagon;

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <p
        className="rounded-full bg-deep-blue px-5 py-2 text-center text-[13.5px] font-semibold text-soft-white"
        aria-live="polite"
      >
        {t.stats(stats.checkedIn, stats.total)}
      </p>

      {result ? (
        <section
          ref={resultRef}
          role="status"
          className={cn("space-y-3 rounded-3xl border-2 p-6 text-deep-blue", tone)}
        >
          <p className="flex items-center gap-3 font-display text-2xl">
            <Icon aria-hidden="true" size={28} />
            {t.result[result.result]}
          </p>
          {result.ticket ? (
            <div className="text-[15px]">
              <p className="font-semibold">{result.ticket.buyerName}</p>
              <p>
                {result.ticket.ticketTypeName} ·{" "}
                <span className="tracking-wider">{result.ticket.code}</span>
              </p>
              {result.result === "already_used" && result.ticket.checkedInAt ? (
                <p className="mt-1 font-semibold">
                  {t.usedAt(formatTime(result.ticket.checkedInAt))}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-[14px]">{t.invalidHint}</p>
          )}
          <Button type="button" variant="deep" className="w-full" onClick={next}>
            {t.scanNext}
          </Button>
        </section>
      ) : null}

      <section className="space-y-3 rounded-3xl border border-hairline bg-white p-4">
        <div className="relative overflow-hidden rounded-2xl bg-charcoal">
          <video
            ref={videoRef}
            muted
            playsInline
            aria-label={t.videoLabel}
            className={cn("aspect-square w-full object-cover", !cameraOn && "opacity-0")}
          />
          {!cameraOn ? (
            <div className="absolute inset-0 flex items-center justify-center text-soft-white/70">
              <FiCamera aria-hidden="true" size={40} />
            </div>
          ) : null}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        {cameraOn ? (
          <Button type="button" variant="secondary" className="w-full" onClick={stopCamera}>
            <FiCameraOff aria-hidden="true" size={16} />
            {t.cameraStop}
          </Button>
        ) : (
          <Button type="button" className="w-full" onClick={startCamera}>
            <FiCamera aria-hidden="true" size={16} />
            {t.cameraStart}
          </Button>
        )}
        <FormAlert message={cameraError} />
        {checking ? <p className="text-center text-[13px] text-charcoal/65">{t.checking}</p> : null}
      </section>

      <form
        onSubmit={handleManual}
        noValidate
        className="flex items-end gap-3 rounded-3xl border border-hairline bg-white p-4"
      >
        <TextField
          tone="light"
          name="code"
          label={t.manual}
          placeholder={t.manualPlaceholder}
          autoCapitalize="characters"
          autoComplete="off"
          error={manualError}
          wrapperClassName="flex-1"
        />
        <Button type="submit" variant="deep" size="sm" className="h-10.5 px-5" disabled={checking}>
          {t.manualSubmit}
        </Button>
      </form>
      <FormAlert message={alert} />
    </div>
  );
}
