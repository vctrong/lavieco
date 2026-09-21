"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { FiArrowRight, FiX } from "react-icons/fi";

import { Button, ConcentricRings, PearlDot } from "@lavieco/ui";

import {
  CATALOGUE_ITEMS,
  CTA_HREF,
  LANGUAGE_SWITCH_ENABLED,
  SOCIAL_LINKS,
} from "../constants/config";
import { TEXT } from "../constants/text";
import { BrandLogo } from "./brand-logo";
import { LanguageSwitch } from "./language-switch";

type CatalogueOverlayProps = {
  id: string;
  dialogRef: RefObject<HTMLDialogElement | null>;
  /** Called after the dialog has closed (button, link, Esc). */
  onClosed: () => void;
};

/**
 * Full-screen "exhibition index". A native modal <dialog> gives us the focus
 * trap, Esc to close and inert background for free (design.md §8.3).
 */
export function CatalogueOverlay({ id, dialogRef, onClosed }: CatalogueOverlayProps) {
  const t = TEXT.vi.menu;
  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      id={id}
      aria-label={t.dialogLabel}
      onClose={onClosed}
      className="deep-sea-pattern fixed inset-0 m-0 size-full max-h-none max-w-none overflow-y-auto bg-deep-blue p-0 text-soft-white opacity-0 transition-[opacity,display,overlay] transition-discrete duration-300 backdrop:bg-transparent open:opacity-100 starting:open:opacity-0"
    >
      <div className="flex min-h-full flex-col justify-between p-8 md:p-14">
        <div className="flex items-center justify-between border-b border-hairline-light pb-6">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-soft-white px-4 py-1.5">
              <BrandLogo className="h-5" />
            </span>
            <PearlDot size="md" tone="canary" />
            <span className="ml-3 hidden text-xs uppercase tracking-museum text-mint-mist/70 sm:inline">
              {t.kicker}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex items-center gap-2 rounded-full border border-hairline-light px-4 py-2 text-xs uppercase tracking-museum text-mint-mist transition-colors hover:text-canary"
          >
            <span>{t.closeLabel}</span>
            <FiX aria-hidden="true" size={14} />
          </button>
        </div>

        <div className="my-auto grid grid-cols-1 items-center gap-8 py-12 lg:grid-cols-12">
          <ul className="flex flex-col space-y-3 lg:col-span-7">
            {CATALOGUE_ITEMS.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={close}
                  className="group flex items-baseline gap-4 border-b border-hairline-light/40 py-2 transition-all hover:pl-3 focus-visible:pl-3"
                >
                  <span className="font-display text-sm tracking-museum text-canary">
                    {item.number}
                  </span>
                  <span className="font-display text-3xl font-light tracking-tight transition-colors group-hover:text-emerald-brand md:text-5xl">
                    {t.items[item.id as keyof typeof t.items]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden flex-col items-center justify-center lg:col-span-5 lg:flex">
            <div
              aria-hidden="true"
              className="relative h-[380px] w-[280px] overflow-hidden rounded-arch border border-soft-white/20 bg-deep-blue/60 p-2 shadow-2xl backdrop-blur-sm"
            >
              <div className="relative flex size-full items-center justify-center overflow-hidden rounded-arch-mat bg-gradient-to-b from-deep-blue via-deep-blue to-emerald-brand/30 p-6">
                <ConcentricRings
                  radii={[50, 90, 130, 170, 210]}
                  className="text-canary opacity-15"
                />
                <div className="z-10 text-center">
                  <PearlDot size="lg" tone="canary" motion="pulse" className="mb-3" />
                  <p className="font-display text-base font-medium text-soft-white">
                    {t.previewTitle}
                  </p>
                  <span className="mt-1 block font-mono text-[10px] uppercase tracking-museum text-mint-mist/70">
                    {t.previewPlace}
                  </span>
                </div>
                <div className="absolute inset-x-4 bottom-4 rounded-xl border border-soft-white/10 bg-soft-white/10 p-3 backdrop-blur-md">
                  <span className="text-[10px] uppercase tracking-museum text-canary">
                    {t.previewNumber}
                  </span>
                  <p className="mt-0.5 font-display text-xs italic text-soft-white">
                    {t.previewQuote}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 border-t border-hairline-light pt-6">
          <div className="flex justify-center sm:justify-start">
            <Button as={Link} href={CTA_HREF} onClick={close} size="md">
              <span>{TEXT.vi.cta}</span>
              <PearlDot size="sm" tone="canary-flat" />
              <FiArrowRight
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Button>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 text-xs text-mint-mist/75 sm:flex-row">
            {LANGUAGE_SWITCH_ENABLED ? <LanguageSwitch current="vi" /> : <span />}
            <p className="font-display text-sm italic text-soft-white/90">{t.quote}</p>
            <div className="flex items-center gap-6">
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-canary"
              >
                {t.facebook}
              </a>
              <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-canary"
              >
                {t.tiktok}
              </a>
              <span className="opacity-50">{t.place}</span>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
