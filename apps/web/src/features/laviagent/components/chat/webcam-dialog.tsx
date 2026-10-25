"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiAlertCircle, FiCamera, FiCheck, FiImage, FiRefreshCw, FiX } from "react-icons/fi";

import { Button } from "@lavieco/ui";

import { TEXT } from "../../constants/text";

const t = TEXT.vi.webcam;

type State =
  | { kind: "starting" }
  | { kind: "live" }
  | { kind: "captured"; blob: Blob; url: string }
  | { kind: "error"; reason: "denied" | "unavailable" };

type WebcamDialogProps = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  /** No camera or no permission: pick a file instead. */
  onFallback: () => void;
};

/** getUserMedia failures that mean "you said no" versus "there is no usable camera". */
const DENIED = new Set(["NotAllowedError", "SecurityError"]);

/**
 * Desktop "Chụp ảnh": browsers ignore `capture` there, so the webcam is used directly.
 * Preview, shoot, retake, use. The stream stops whenever the dialog closes; nothing is
 * recorded or uploaded until the visitor sends the photo from the composer.
 */
export function WebcamDialog({ open, onClose, onCapture, onFallback }: WebcamDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<State>({ kind: "starting" });

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setState({ kind: "live" });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : "";
        setState({ kind: "error", reason: DENIED.has(name) ? "denied" : "unavailable" });
      });
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, stopStream]);

  // The preview URL lives as long as the captured state.
  useEffect(
    () => () => {
      if (state.kind === "captured") URL.revokeObjectURL(state.url);
    },
    [state],
  );

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) setState({ kind: "captured", blob, url: URL.createObjectURL(blob) });
      },
      "image/jpeg",
      0.92,
    );
  };

  const use = () => {
    if (state.kind !== "captured") return;
    onCapture(new File([state.blob], "webcam.jpg", { type: "image/jpeg" }));
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={t.title}
      onClose={() => {
        stopStream();
        setState({ kind: "starting" });
        onClose();
      }}
      className="m-auto w-[min(40rem,calc(100%-2rem))] max-w-none rounded-[2rem] bg-soft-white p-0 text-charcoal shadow-phone backdrop:modal-scrim"
    >
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <p className="min-w-0 flex-1 font-display text-xl text-deep-blue">{t.title}</p>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label={t.close}
          className="flex size-11 items-center justify-center rounded-full bg-mint-mist text-deep-blue"
        >
          <FiX aria-hidden="true" size={18} />
        </button>
      </div>

      <div className="p-4">
        {state.kind === "error" ? (
          <div role="alert" className="space-y-4 py-6 text-center">
            <FiAlertCircle aria-hidden="true" size={28} className="mx-auto text-deep-blue" />
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-charcoal/80">
              {state.reason === "denied" ? t.denied : t.unavailable}
            </p>
            <Button
              type="button"
              onClick={() => {
                dialogRef.current?.close();
                onFallback();
              }}
            >
              <FiImage aria-hidden="true" size={16} />
              {t.fallback}
            </Button>
          </div>
        ) : (
          <>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-deep-blue">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                aria-label={t.preview}
                className={state.kind === "captured" ? "hidden" : "size-full object-cover"}
              />
              {state.kind === "captured" ? (
                <Image
                  src={state.url}
                  alt={t.capturedAlt}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : null}
              {state.kind === "starting" ? (
                <p
                  role="status"
                  className="absolute inset-0 flex items-center justify-center text-sm text-soft-white/80"
                >
                  {t.starting}
                </p>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {state.kind === "captured" ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setState({ kind: "live" })}
                  >
                    <FiRefreshCw aria-hidden="true" size={16} />
                    {t.retake}
                  </Button>
                  <Button type="button" onClick={use}>
                    <FiCheck aria-hidden="true" size={16} />
                    {t.use}
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={shoot} disabled={state.kind !== "live"}>
                  <FiCamera aria-hidden="true" size={16} />
                  {t.shoot}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
