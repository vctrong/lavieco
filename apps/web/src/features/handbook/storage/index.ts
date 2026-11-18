/**
 * What a reader keeps on this device (UC-02, GĐ1): the page being read, bookmarked
 * pages and the page-turn sound switch. The only place that touches `localStorage` for
 * the handbook (docs/04 §5). Every access is guarded: private windows and blocked site
 * data must never break reading. GĐ2 syncs this per account (`reader_states`).
 */

const PREFIX = "lavieco.handbook";

type Stored = { lastPage?: number; bookmarks?: string[]; sound?: boolean };

const keyOf = (slug: string) => `${PREFIX}.${slug}`;

function read(slug: string): Stored {
  try {
    const raw = window.localStorage.getItem(keyOf(slug));
    if (!raw) return {};
    const value = JSON.parse(raw) as unknown;
    return typeof value === "object" && value !== null ? (value as Stored) : {};
  } catch {
    return {};
  }
}

function write(slug: string, change: Partial<Stored>) {
  try {
    window.localStorage.setItem(keyOf(slug), JSON.stringify({ ...read(slug), ...change }));
  } catch {
    // Storage blocked or full: reading still works, only memory is lost.
  }
}

export function lastPage(slug: string): number | null {
  const page = read(slug).lastPage;
  return typeof page === "number" && Number.isInteger(page) && page > 0 ? page : null;
}

export function rememberPage(slug: string, page: number) {
  write(slug, { lastPage: page });
}

/** Bookmarks are page keys: they survive pages being reordered between versions. */
export function bookmarks(slug: string): string[] {
  const list = read(slug).bookmarks;
  return Array.isArray(list) ? list.filter((key) => typeof key === "string").slice(0, 300) : [];
}

const listeners = new Set<() => void>();

/** For `useSyncExternalStore`: bookmark changes in this tab or another one. */
export function subscribeBookmarks(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** A stable snapshot (a string) of the bookmarks, for `useSyncExternalStore`. */
export function bookmarksSnapshot(slug: string): string {
  return bookmarks(slug).join(",");
}

export function toggleBookmark(slug: string, key: string): string[] {
  const current = bookmarks(slug);
  const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
  write(slug, { bookmarks: next });
  for (const listener of listeners) listener();
  return next;
}

/** Page-turn sound is off unless the reader turned it on. */
export function soundOn(slug: string): boolean {
  return read(slug).sound === true;
}

export function setSound(slug: string, on: boolean) {
  write(slug, { sound: on });
}
