"use client";

import { useState } from "react";
import { FiCheck, FiLink } from "react-icons/fi";

import { Button } from "@lavieco/ui";

import { TEXT } from "../constants/text";

/** Copies the current admin URL (the shareable preview link, behind login). */
export function CopyLinkButton() {
  const t = TEXT.vi.preview;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Button type="button" variant="secondary" size="sm" onClick={copy}>
      {copied ? <FiCheck aria-hidden="true" size={14} /> : <FiLink aria-hidden="true" size={14} />}
      <span aria-live="polite">{copied ? t.copied : t.copy}</span>
    </Button>
  );
}
