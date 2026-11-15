// @vitest-environment happy-dom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFormDraft, type DraftRecord, type DraftStore } from "@lavieco/ui";

/** In-memory store with switchable failure, standing in for IndexedDB. */
function memoryStore() {
  const map = new Map<string, DraftRecord<unknown>>();
  const state = { failing: false, puts: 0 };
  const store: DraftStore = {
    get: async <T,>(key: string) => (map.get(key) as DraftRecord<T> | undefined) ?? null,
    put: async (record) => {
      state.puts += 1;
      if (state.failing) throw new Error("quota");
      map.set(record.key, record as DraftRecord<unknown>);
    },
    remove: async (key) => {
      map.delete(key);
    },
    removeOwner: async () => undefined,
    prune: async () => undefined,
  };
  return { store, map, state };
}

type Values = { title: string };
type Api = ReturnType<typeof useFormDraft<Values>>;

let root: Root;
let container: HTMLElement;
let api: Api;
const restored = vi.fn();
const expose = (next: Api) => {
  api = next;
};

function Harness(props: {
  store: DraftStore;
  owner: string;
  values: Values;
  dirty: boolean;
  revision: number;
}) {
  const result = useFormDraft<Values>({
    form: "test",
    record: "r1",
    onRestore: restored,
    delayMs: 500,
    ...props,
  });
  useEffect(() => expose(result));
  return null;
}

async function render(props: Parameters<typeof Harness>[0]) {
  await act(async () => {
    root.render(<Harness {...props} />);
  });
}

const flush = () => act(async () => {});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  container = document.createElement("div");
  root = createRoot(container);
  restored.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
});

describe("useFormDraft", () => {
  it("writes once after the pause in typing, not on every keystroke", async () => {
    const { store, map, state } = memoryStore();
    const base = { store, owner: "staff-a", dirty: true, revision: 3 };
    await render({ ...base, values: { title: "L" } });
    await render({ ...base, values: { title: "La" } });
    await render({ ...base, values: { title: "Lav" } });
    expect(api.status.kind).toBe("typing");
    expect(state.puts).toBe(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    await flush();

    expect(state.puts).toBe(1);
    expect(map.get("staff-a:test:r1")?.values).toEqual({ title: "Lav" });
    expect(api.status.kind).toBe("saved");
  });

  it("writes at once when the tab is hidden", async () => {
    const { store, state } = memoryStore();
    await render({ store, owner: "staff-a", dirty: true, revision: 1, values: { title: "x" } });
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await flush();
    expect(state.puts).toBe(1);
  });

  it("never shows 'saved' when the browser refuses to store", async () => {
    const { store, state } = memoryStore();
    state.failing = true;
    await render({ store, owner: "staff-a", dirty: true, revision: 1, values: { title: "x" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    await flush();
    expect(api.status.kind).toBe("failed");
  });

  it("offers a stored draft instead of applying it, and flags a newer server copy", async () => {
    const { store, map, state } = memoryStore();
    map.set("staff-a:test:r1", {
      key: "staff-a:test:r1",
      owner: "staff-a",
      values: { title: "from draft" },
      baseRevision: 2,
      savedAt: 1,
    });
    await render({ store, owner: "staff-a", dirty: false, revision: 5, values: { title: "" } });
    await flush();

    expect(api.offer).toEqual({ savedAt: 1, stale: true });
    expect(restored).not.toHaveBeenCalled();

    // Typing while the offer is open must not overwrite the old draft.
    await render({ store, owner: "staff-a", dirty: true, revision: 5, values: { title: "n" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(state.puts).toBe(0);
    expect(api.status.kind).toBe("held");

    await act(async () => api.restore());
    expect(restored).toHaveBeenCalledWith({ title: "from draft" });
    expect(api.offer).toBeNull();
  });

  it("keeps drafts of different people apart", async () => {
    const { store, map } = memoryStore();
    map.set("staff-a:test:r1", {
      key: "staff-a:test:r1",
      owner: "staff-a",
      values: { title: "a's" },
      baseRevision: 1,
      savedAt: 1,
    });
    await render({ store, owner: "staff-b", dirty: false, revision: 1, values: { title: "" } });
    await flush();
    expect(api.offer).toBeNull();
  });

  it("removes the draft once the server accepted the form", async () => {
    const { store, map } = memoryStore();
    await render({ store, owner: "staff-a", dirty: true, revision: 1, values: { title: "x" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    await flush();
    expect(map.size).toBe(1);

    await act(async () => api.clear());
    await render({ store, owner: "staff-a", dirty: false, revision: 2, values: { title: "x" } });
    await flush();
    expect(map.size).toBe(0);
    expect(api.status.kind).toBe("idle");
  });
});
