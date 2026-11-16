/**
 * Where unsaved form input is kept between page loads. Browser-only; every method may
 * fail (private mode, quota, blocked storage) and callers treat a failure as "not saved".
 */
export type DraftRecord<T> = {
  /** `owner:form:record`, see `draftKey`. */
  key: string;
  owner: string;
  values: T;
  /** Server `revision` the edits started from; null for a record not created yet. */
  baseRevision: number | null;
  savedAt: number;
};

export type DraftStore = {
  get<T>(key: string): Promise<DraftRecord<T> | null>;
  put<T>(record: DraftRecord<T>): Promise<void>;
  remove(key: string): Promise<void>;
  /** Removes every draft of one owner (sign-out on a shared computer). */
  removeOwner(owner: string): Promise<void>;
  /** Removes drafts older than `maxAgeMs`. */
  prune(maxAgeMs: number): Promise<void>;
};

/** One key per person, form and record, so drafts never cross accounts or records. */
export function draftKey(owner: string, form: string, record: string): string {
  return `${owner}:${form}:${record}`;
}

const STORE = "drafts";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexeddb request failed"));
  });
}

/**
 * IndexedDB store, for long staff editors: survives closing the tab and the browser.
 * One connection per page, opened on first use.
 */
export function createIndexedDbDraftStore(dbName: string): DraftStore {
  let db: Promise<IDBDatabase> | null = null;

  const open = () => {
    db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("owner", "owner");
        store.createIndex("savedAt", "savedAt");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("indexeddb open failed"));
      req.onblocked = () => reject(new Error("indexeddb blocked"));
    }).catch((error: unknown) => {
      db = null;
      throw error;
    });
    return db;
  };

  const tx = async (mode: IDBTransactionMode) =>
    (await open()).transaction(STORE, mode).objectStore(STORE);

  const removeWhere = async (index: string, range: IDBKeyRange) => {
    const store = await tx("readwrite");
    const keys = await request(store.index(index).getAllKeys(range));
    await Promise.all(keys.map((key) => request(store.delete(key))));
  };

  return {
    async get<T>(key: string) {
      const found = await request((await tx("readonly")).get(key));
      return (found as DraftRecord<T> | undefined) ?? null;
    },
    async put(record) {
      await request((await tx("readwrite")).put(record));
    },
    async remove(key) {
      await request((await tx("readwrite")).delete(key));
    },
    removeOwner: (owner) => removeWhere("owner", IDBKeyRange.only(owner)),
    prune: (maxAgeMs) => removeWhere("savedAt", IDBKeyRange.upperBound(Date.now() - maxAgeMs)),
  };
}

/**
 * sessionStorage store, for public forms holding personal data (BR-06): it survives a
 * reload or a failed submit in the same tab but is gone when the tab closes, so the next
 * person on a shared computer never sees it.
 */
export function createSessionDraftStore(prefix: string): DraftStore {
  const full = (key: string) => `${prefix}:${key}`;
  /** Storage's own API: `Object.keys(sessionStorage)` is not portable. */
  const names = () => {
    const found: string[] = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const name = sessionStorage.key(index);
      if (name?.startsWith(`${prefix}:`)) found.push(name);
    }
    return found;
  };
  const entries = () =>
    names().map((name) => {
      try {
        return { name, record: JSON.parse(sessionStorage.getItem(name) ?? "null") as unknown };
      } catch {
        return { name, record: null };
      }
    });

  return {
    async get<T>(key: string) {
      const raw = sessionStorage.getItem(full(key));
      return raw ? (JSON.parse(raw) as DraftRecord<T>) : null;
    },
    async put(record) {
      sessionStorage.setItem(full(record.key), JSON.stringify(record));
    },
    async remove(key) {
      sessionStorage.removeItem(full(key));
    },
    async removeOwner(owner) {
      for (const { name, record } of entries()) {
        if ((record as DraftRecord<unknown> | null)?.owner === owner) {
          sessionStorage.removeItem(name);
        }
      }
    },
    async prune(maxAgeMs) {
      const limit = Date.now() - maxAgeMs;
      for (const { name, record } of entries()) {
        const savedAt = (record as DraftRecord<unknown> | null)?.savedAt;
        if (typeof savedAt !== "number" || savedAt < limit) sessionStorage.removeItem(name);
      }
    },
  };
}
