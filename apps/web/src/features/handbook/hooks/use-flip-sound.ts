"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

import { setSound, soundOn, subscribeBookmarks } from "../storage";

/** Short paper sound made for LAVIECO (public/sounds, docs/brand/am-thanh.md). */
const SOUND_SRC = "/sounds/page-flip.wav";

/**
 * The page-turn sound: off by default, remembered per device. The file is only
 * fetched once the reader turns it on.
 */
export function useFlipSound(slug: string) {
  const on = useSyncExternalStore(
    subscribeBookmarks,
    () => soundOn(slug),
    () => false,
  );
  const audio = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    if (!on) return;
    audio.current ??= new Audio(SOUND_SRC);
    audio.current.volume = 0.5;
    audio.current.currentTime = 0;
    // Autoplay rules or a missing device: silence is fine.
    void audio.current.play().catch(() => undefined);
  }, [on]);

  const toggle = useCallback(() => setSound(slug, !on), [slug, on]);

  return { on, play, toggle };
}
