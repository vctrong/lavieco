"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { FiTrash2, FiUpload, FiUser } from "react-icons/fi";

import { MEDIA_ACCEPT, checkImageFile, type Media } from "@lavieco/shared/media";
import { Button } from "@lavieco/ui";

import { MEDIA_DELIVERY_READY, MediaImage } from "@/shared/components/media-image";
import { VIEWER_CHANGED_EVENT } from "@/shared/constants/events";

import { TEXT } from "../constants/text";
import type { AvatarFailure, AvatarResult } from "../types";

const t = TEXT.vi.avatar;

const messageOf = (reason: AvatarFailure, format?: string) =>
  t.errors[reason].replace("{format}", (format ?? "HEIC").toUpperCase());

/**
 * The member's avatar (ADR-0020): optional, replaceable and removable at any time.
 * HEIC/AVIF and oversized files are refused here before anything is sent; the
 * service checks the real content again and strips EXIF before storing.
 */
export function AvatarField({ avatar }: { avatar: Media | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  async function send(init: RequestInit, kind: "upload" | "remove") {
    setBusy(kind);
    setMessage(null);
    try {
      const response = await fetch("/api/account/avatar", init);
      const result = (await response.json().catch(() => null)) as AvatarResult | null;
      if (result?.status === "ok") {
        setMessage({ tone: "ok", text: kind === "upload" ? t.saved : t.removed });
        router.refresh();
        // The navigation's avatar lives in the layout, which a refresh does not re-fetch.
        window.dispatchEvent(new Event(VIEWER_CHANGED_EVENT));
        return;
      }
      setMessage({
        tone: "error",
        text:
          result?.status === "error"
            ? messageOf(result.reason, result.format)
            : messageOf("unavailable"),
      });
    } catch {
      setMessage({ tone: "error", text: messageOf("unavailable") });
    } finally {
      setBusy(null);
    }
  }

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const issue = checkImageFile(file, "avatar");
    if (issue) {
      setMessage({
        tone: "error",
        text: messageOf(issue.code, issue.code === "format_refused" ? issue.format : undefined),
      });
      return;
    }
    const body = new FormData();
    body.set("file", file);
    void send({ method: "POST", body }, "upload");
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mint-mist text-deep-blue/50">
        {avatar && MEDIA_DELIVERY_READY ? (
          <MediaImage
            publicId={avatar.publicId}
            alt={t.alt}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <FiUser aria-hidden="true" size={28} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-3 text-[12.5px] leading-relaxed text-charcoal/70">{t.hint}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            type="file"
            accept={MEDIA_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={pick}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy !== null}
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-2 disabled:opacity-60"
          >
            <FiUpload aria-hidden="true" size={13} />
            {busy === "upload" ? t.uploading : avatar ? t.replace : t.choose}
          </Button>
          {avatar ? (
            <Button
              type="button"
              variant="link"
              disabled={busy !== null}
              onClick={() => void send({ method: "DELETE" }, "remove")}
              className="inline-flex items-center gap-1.5 text-[12.5px]"
            >
              <FiTrash2 aria-hidden="true" size={13} />
              {busy === "remove" ? t.removing : t.remove}
            </Button>
          ) : null}
        </div>
        {message ? (
          <p
            role={message.tone === "error" ? "alert" : "status"}
            className="mt-2 text-[12.5px] font-medium text-deep-blue"
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
