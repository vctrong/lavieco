export type ScrollSnapshot = {
  scrollY: number;
  /** 0..1 of the scrollable distance. */
  progress: number;
};

type Listener = (snapshot: ScrollSnapshot) => void;

const listeners = new Set<Listener>();
let frame = 0;
let attached = false;

function read(): ScrollSnapshot {
  const root = document.documentElement;
  const scrollY = window.scrollY;
  const scrollable = Math.max(1, root.scrollHeight - root.clientHeight);
  return { scrollY, progress: Math.min(1, Math.max(0, scrollY / scrollable)) };
}

function flush() {
  frame = 0;
  const snapshot = read();
  listeners.forEach((listener) => listener(snapshot));
}

function schedule() {
  if (frame) return;
  frame = window.requestAnimationFrame(flush);
}

/**
 * One passive scroll listener shared by every subscriber; updates are batched
 * in requestAnimationFrame. Subscribers write to the DOM directly (no React
 * re-render per frame).
 */
export function subscribeScroll(listener: Listener): () => void {
  listeners.add(listener);
  if (!attached) {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    attached = true;
  }
  listener(read());

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && attached) {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frame);
      frame = 0;
      attached = false;
    }
  };
}
