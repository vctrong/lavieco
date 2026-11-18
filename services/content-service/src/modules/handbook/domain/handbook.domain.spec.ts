import { describe, expect, it } from "vitest";

import { DomainError } from "@lavieco/shared";

import {
  applyPageUpdate,
  applyStructure,
  aspectIsOff,
  assertPublishable,
  keptVersionIds,
  mediaIdsInUse,
  newPageKey,
  publishWarnings,
  textIsMissing,
  type PageRecord,
  type VersionContent,
} from "./handbook";
import { applyImport } from "./import-plan";
import { toPublicHandbook, toPublicPageDetail } from "./public-view";
import { publishAlert } from "./publish-alert";
import { searchPages } from "./search";

const C1 = "11111111-1111-4111-8111-111111111111";
const C2 = "22222222-2222-4222-8222-222222222222";
const P1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const P2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const P3 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const image = (mediaId: string) => ({
  mediaId,
  publicId: `x/${mediaId}`,
  width: 1748,
  height: 2480,
});

const page = (id: string, chapterId: string, extra: Partial<PageRecord> = {}): PageRecord => ({
  id,
  key: newPageKey(),
  chapterId,
  title: `Trang ${id.slice(0, 1)}`,
  alt: "",
  image: image(`m-${id.slice(0, 1)}`),
  text: "Vỏ sò được rửa sạch, phơi khô rồi nghiền thành bột mịn để làm chậu cây.",
  textSource: "pdf",
  hotspots: [],
  ...extra,
});

const content = (): VersionContent => ({
  title: "Cẩm nang",
  description: "",
  covers: { front: null, back: null },
  chapters: [
    { id: C1, slug: "lam-quen", title: "Làm quen", tint: "mint", kind: "content" },
    { id: C2, slug: "tu-tay-lam", title: "Tự tay làm", tint: "canary", kind: "content" },
  ],
  pages: [page(P1, C1), page(P2, C1), page(P3, C2)],
});

const expectCode = (fn: () => unknown, code: string) => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return;
  }
  throw new Error(`expected ${code}`);
};

describe("covers and chapter kinds", () => {
  it("keeps front matter first and appendices last, pages following their chapter", () => {
    const next = applyStructure(content(), {
      revision: 1,
      title: "Cẩm nang",
      description: "",
      keepCovers: { front: true, back: true },
      chapters: [
        { id: C1, title: "Phụ lục", tint: "paper", kind: "appendix" },
        { id: C2, title: "Lời mở đầu", tint: "mint", kind: "front_matter" },
      ],
      pages: [
        { id: P1, chapterId: C1 },
        { id: P3, chapterId: C2 },
        { id: P2, chapterId: C1 },
      ],
    });
    expect(next.chapters.map((c) => c.kind)).toEqual(["front_matter", "appendix"]);
    expect(next.pages.map((p) => p.id)).toEqual([P3, P1, P2]);
  });

  it("sets a cover from an import and removes it on request", () => {
    const withCover = applyImport(content(), { mode: "cover_front" }, [
      { image: image("cover"), text: "" },
    ]);
    expect(withCover.covers.front?.mediaId).toBe("cover");
    expect(withCover.pages).toHaveLength(3);
    expect([...mediaIdsInUse([withCover])]).toContain("cover");
    const removed = applyStructure(withCover, {
      revision: 1,
      title: "x",
      description: "",
      keepCovers: { front: false, back: true },
      chapters: withCover.chapters.map(({ id, title, tint, kind }) => ({ id, title, tint, kind })),
      pages: withCover.pages.map(({ id, chapterId }) => ({ id, chapterId })),
    });
    expect(removed.covers.front).toBeNull();
  });
});

describe("page key", () => {
  it("is 8 Crockford characters and random", () => {
    const keys = new Set(Array.from({ length: 200 }, newPageKey));
    expect(keys.size).toBe(200);
    for (const key of keys) expect(key).toMatch(/^[0-9a-hjkmnp-tv-z]{8}$/);
  });
});

describe("text and aspect flags", () => {
  it("flags a page with almost no text", () => {
    expect(textIsMissing("  12  ")).toBe(true);
    expect(textIsMissing("Một câu đủ dài để tìm kiếm được.")).toBe(false);
  });

  it("warns beyond 3 % from A5, not within", () => {
    expect(aspectIsOff(1748, 2480)).toBe(false);
    expect(aspectIsOff(1000, 1000)).toBe(true);
  });
});

describe("applyStructure", () => {
  it("reorders pages, moves them between chapters and removes the ones left out", () => {
    const next = applyStructure(content(), {
      revision: 1,
      title: "Cẩm nang",
      description: "",
      keepCovers: { front: true, back: true },
      chapters: [
        { id: C2, title: "Tự tay làm", tint: "canary", kind: "content" },
        { id: C1, title: "Làm quen", tint: "mint", kind: "content" },
      ],
      pages: [
        { id: P3, chapterId: C2 },
        { id: P1, chapterId: C2 },
      ],
    });
    expect(next.pages.map((p) => p.id)).toEqual([P3, P1]);
    expect(next.pages[1]!.chapterId).toBe(C2);
    // Slugs are kept: product links point to them.
    expect(next.chapters.map((c) => c.slug)).toEqual(["tu-tay-lam", "lam-quen"]);
  });

  it("refuses unknown or repeated pages", () => {
    const base = {
      revision: 1,
      title: "x",
      description: "",
      keepCovers: { front: true, back: true },
      chapters: [{ id: C1, title: "a", tint: "mint" as const, kind: "content" as const }],
    };
    expectCode(
      () =>
        applyStructure(content(), {
          ...base,
          pages: [
            { id: P1, chapterId: C1 },
            { id: P1, chapterId: C1 },
          ],
        }),
      "handbook.structure_invalid",
    );
    expectCode(
      () => applyStructure(content(), { ...base, pages: [{ id: P1, chapterId: C2 }] }),
      "handbook.structure_invalid",
    );
  });

  it("drops hotspots leading to a removed page", () => {
    const start = content();
    start.pages[0]!.hotspots = [
      {
        id: P2,
        x: 1,
        y: 1,
        w: 10,
        h: 10,
        label: "Sang trang",
        target: { type: "page", pageId: P2 },
      },
    ];
    const next = applyStructure(start, {
      revision: 1,
      title: "x",
      description: "",
      keepCovers: { front: true, back: true },
      chapters: [{ id: C1, title: "a", tint: "mint", kind: "content" }],
      pages: [{ id: P1, chapterId: C1 }],
    });
    expect(next.pages[0]!.hotspots).toEqual([]);
  });
});

describe("applyPageUpdate", () => {
  it("marks typed text as manual", () => {
    const next = applyPageUpdate(content(), P1, {
      revision: 1,
      title: "Bìa",
      alt: "Bìa sổ",
      text: "Chữ gõ tay cho trang bìa của cuốn sổ.",
      hotspots: [],
    });
    expect(next.pages[0]!.textSource).toBe("manual");
    expect(next.pages[0]!.title).toBe("Bìa");
  });

  it("refuses a hotspot to a page outside the book", () => {
    expectCode(
      () =>
        applyPageUpdate(content(), P1, {
          revision: 1,
          title: "Bìa",
          alt: "",
          text: "",
          hotspots: [
            {
              id: P2,
              x: 1,
              y: 1,
              w: 10,
              h: 10,
              label: "x",
              target: { type: "page", pageId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" },
            },
          ],
        }),
      "handbook.structure_invalid",
    );
  });
});

describe("publishing rules", () => {
  it("blocks an empty book and an empty chapter", () => {
    expectCode(() => assertPublishable({ ...content(), pages: [] }), "handbook.publish_blocked");
    const noC2 = content();
    noC2.pages = noC2.pages.filter((p) => p.chapterId === C1);
    expectCode(() => assertPublishable(noC2), "handbook.publish_blocked");
    expect(() => assertPublishable(content())).not.toThrow();
  });

  it("warns when fewer than half of the pages have text", () => {
    const quiet = content();
    quiet.pages = quiet.pages.map((p, i) => (i < 2 ? { ...p, text: "" } : p));
    expect(publishWarnings(quiet)).toContain("low_text_ratio");
    expect(publishWarnings(content())).toEqual([]);
  });

  it("keeps the published version, the draft and the 3 latest archived ones", () => {
    const versions = [1, 2, 3, 4, 5].map((n) => ({
      id: `v${n}`,
      number: n,
      status: "archived" as const,
      publishedAt: new Date() as Date | null,
    }));
    versions.push({ id: "v6", number: 6, status: "archived", publishedAt: new Date() });
    // A discarded draft never takes a slot.
    versions.push({ id: "v6b", number: 9, status: "archived", publishedAt: null });
    const kept = keptVersionIds([
      ...versions,
      { id: "v7", number: 7, status: "published", publishedAt: new Date() },
      { id: "v8", number: 8, status: "draft", publishedAt: null },
    ]);
    expect([...kept].sort()).toEqual(["v4", "v5", "v6", "v7", "v8"]);
  });
});

describe("applyImport", () => {
  const imported = (n: number, text = "") =>
    Array.from({ length: n }, (_, i) => ({ image: image(`new-${i}`), text }));

  it("appends after the chosen chapter's last page", () => {
    const next = applyImport(
      content(),
      { mode: "append", chapterId: C1 },
      imported(2, "Chữ mới đủ dài để tìm kiếm."),
    );
    expect(next.pages.map((p) => p.chapterId)).toEqual([C1, C1, C1, C1, C2]);
    expect(next.pages[2]!.textSource).toBe("pdf");
  });

  it("replaces the whole book keeping ids, addresses and hotspots by position", () => {
    const start = content();
    const before = start.pages.map((p) => ({ id: p.id, key: p.key }));
    const next = applyImport(start, { mode: "replace_all" }, imported(4));
    expect(next.pages.slice(0, 3).map((p) => ({ id: p.id, key: p.key }))).toEqual(before);
    expect(next.pages[0]!.image.mediaId).toBe("new-0");
    expect(next.pages).toHaveLength(4);
    expect(next.pages[3]!.chapterId).toBe(C2);
  });

  it("keeps hand-typed text when the new file has none", () => {
    const start = content();
    start.pages[0] = {
      ...start.pages[0]!,
      text: "Chữ gõ tay rất quan trọng của nhóm.",
      textSource: "manual",
    };
    const next = applyImport(start, { mode: "replace_page", pageId: P1 }, imported(1));
    expect(next.pages[0]!.text).toBe("Chữ gõ tay rất quan trọng của nhóm.");
    expect(next.pages[0]!.image.mediaId).toBe("new-0");
  });
});

describe("public view", () => {
  it("numbers pages, hides empty chapters and resolves page hotspots to keys", () => {
    const start = content();
    start.chapters.push({
      id: "33333333-3333-4333-8333-333333333333",
      slug: "trong",
      title: "Trống",
      tint: "paper",
      kind: "content",
    });
    start.pages[0]!.hotspots = [
      {
        id: P2,
        x: 1,
        y: 1,
        w: 10,
        h: 10,
        label: "Sang trang 3",
        target: { type: "page", pageId: P3 },
      },
    ];
    const version = {
      ...start,
      id: "v1",
      handbookId: "h",
      number: 2,
      status: "published" as const,
      note: "n",
      basedOnNumber: null,
      revision: 1,
      createdBy: { userId: "u", name: "Lan" },
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedBy: { userId: "u", name: "Lan" },
      publishedAt: new Date("2026-11-19T00:00:00Z"),
    };
    const book = toPublicHandbook("cam-nang-xanh-so", "free", version);
    expect(book.chapters.map((c) => [c.firstPage, c.pageCount])).toEqual([
      [1, 2],
      [3, 1],
    ]);
    expect(book.pages[0]!.hotspots[0]!.target).toEqual({
      type: "page",
      pageKey: start.pages[2]!.key,
      number: 3,
    });
    // No draft or internal fields leak (S3).
    expect(JSON.stringify(book)).not.toMatch(/mediaId|revision|note|publishedBy|createdBy/);
    const detail = toPublicPageDetail(version, start.pages[1]!.key);
    expect(detail.previous?.number).toBe(1);
    expect(detail.next?.number).toBe(3);
  });
});

describe("searchPages", () => {
  const pages = [
    { key: "aaaaaaaa", number: 1, chapterId: C1, title: "Bìa", text: "Chào mừng các bạn nhỏ." },
    {
      key: "bbbbbbbb",
      number: 2,
      chapterId: C1,
      title: "Vỏ sò đến từ đâu",
      text: "Mỗi ngày chợ cá thải ra rất nhiều VỎ SÒ. Chúng mình gom vỏ sò về rửa sạch.",
    },
  ];

  it("finds words without accents and highlights them in the snippet", () => {
    const [hit, ...rest] = searchPages(pages, "vo so");
    expect(rest).toEqual([]);
    expect(hit!.key).toBe("bbbbbbbb");
    const marked = hit!.highlights.map(([at, length]) => hit!.snippet.slice(at, at + length));
    expect(marked).toContain("VỎ");
    expect(marked).toContain("sò");
  });

  it("needs every word", () => {
    expect(searchPages(pages, "vỏ sò bánh")).toEqual([]);
  });
});

describe("publishAlert", () => {
  it("names the publisher, version and note, and opens the history", () => {
    const alert = publishAlert(
      { id: "v9", number: 9, note: "Thay trang 12", publishedBy: { userId: "u", name: "Lan" } },
      null,
    );
    expect(alert.body).toBe("Lan đã xuất bản Cẩm nang Xanh số phiên bản 9 — Thay trang 12");
    expect(alert.url).toBe("/handbook/history");
    expect(
      publishAlert({ id: "v9", number: 9, note: "x", publishedBy: null }, null).notificationId,
    ).toBe(alert.notificationId);
  });
});
