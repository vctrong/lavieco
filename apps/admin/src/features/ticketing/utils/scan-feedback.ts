import type { CheckinResponse } from "@lavieco/shared/events";

type Result = CheckinResponse["result"];

/** One short tone per result: high = valid, two mid = already used, low = invalid. */
const TONES: Record<Result, { frequency: number; durationMs: number; repeat: number }> = {
  valid: { frequency: 1320, durationMs: 120, repeat: 1 },
  already_used: { frequency: 660, durationMs: 110, repeat: 2 },
  invalid: { frequency: 220, durationMs: 320, repeat: 1 },
};

/** Vibration patterns (Android; iOS Safari has no Vibration API and simply skips it). */
const VIBRATIONS: Record<Result, number[]> = {
  valid: [80],
  already_used: [60, 80, 60],
  invalid: [250],
};

type AudioContextConstructor = typeof AudioContext;

/**
 * Sound and vibration for the door scanner (docs/05 §5.6) so the team does not have to
 * look at the screen for every ticket. iOS only plays Web Audio after a tap: call
 * `unlock()` from the "start camera" or "check" button first.
 */
export function createScanFeedback() {
  let context: AudioContext | null = null;

  function unlock() {
    if (context) {
      void context.resume().catch(() => undefined);
      return;
    }
    const Constructor =
      globalThis.AudioContext ??
      (globalThis as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
    if (!Constructor) return;
    try {
      context = new Constructor();
    } catch {
      context = null;
    }
  }

  function beep(result: Result) {
    if (!context || context.state !== "running") return;
    const tone = TONES[result];
    const step = (tone.durationMs + 70) / 1000;
    for (let index = 0; index < tone.repeat; index += 1) {
      const start = context.currentTime + index * step;
      const end = start + tone.durationMs / 1000;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = tone.frequency;
      // Short ramps avoid the click of a hard start/stop.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    }
  }

  function signal(result: Result) {
    beep(result);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(VIBRATIONS[result]);
    }
  }

  function close() {
    void context?.close().catch(() => undefined);
    context = null;
  }

  return { unlock, signal, close };
}
