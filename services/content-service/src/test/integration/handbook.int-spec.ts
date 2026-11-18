import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import {
  handbookImportJobSchema,
  handbookOverviewSchema,
  handbookPublishResultSchema,
  handbookUploadSchema,
  publicHandbookPageDetailSchema,
  publicHandbookSchema,
  type HandbookImportMode,
  type HandbookOverview,
} from "@lavieco/shared/content";

import { HANDBOOK_EDITOR } from "../../modules/handbook";
import type { HandbookEditor } from "../../modules/handbook/application/handbook-editor";
import {
  bearer,
  createTestApp,
  drainOutbox,
  runHandbookImports,
  type TestApp,
} from "../support/test-app";

let t: TestApp;
let editor: string;

beforeAll(async () => {
  t = await createTestApp(inject("mongoUri"));
  editor = bearer(await t.staffToken(["content_editor"]));
});

afterAll(async () => {
  await t?.close();
});

const TEXT = [
  "Vỏ sò được rửa sạch, phơi khô rồi nghiền thành bột mịn cho chậu cây.",
  "",
  "Các bạn nhỏ cùng ba mẹ trộn bột vỏ sò với keo tự nhiên và đổ khuôn.",
];

/** A fake PDF understood by `FakePdf`: one `<w>x<h>|<text>` line per page. */
const fakePdf = (texts: readonly string[], extra = "") =>
  Buffer.from(`%PDF-1.7 ${extra}\n${texts.map((text) => `100x141|${text}`).join("\n")}\n`, "utf8");

const pageImage = (seed: number) =>
  sharp({ create: { width: 100, height: 141, channels: 3, background: { r: seed, g: 10, b: 10 } } })
    .png()
    .toBuffer();

async function overview(): Promise<HandbookOverview> {
  const res = await t.http().get("/internal/v1/handbook").set("authorization", editor).expect(200);
  return handbookOverviewSchema.parse(res.body);
}

async function upload(kind: "pdf" | "image", bytes: Buffer) {
  const created = handbookUploadSchema.parse(
    (
      await t
        .http()
        .post("/internal/v1/handbook/uploads")
        .set("authorization", editor)
        .send({ kind, fileName: kind === "pdf" ? "so.pdf" : "trang.png", size: bytes.length })
        .expect(201)
    ).body,
  );
  await t
    .http()
    .put(`/internal/v1/handbook/uploads/${created.id}/chunks/0`)
    .set("authorization", editor)
    .attach("chunk", bytes, "chunk")
    .expect(200);
  return created.id;
}

async function importInto(
  uploadIds: string[],
  mode: HandbookImportMode,
  extra: Record<string, string> = {},
) {
  const draft = (await overview()).draft!;
  const res = await t
    .http()
    .post("/internal/v1/handbook/imports")
    .set("authorization", editor)
    .send({ revision: draft.revision, uploadIds, mode, ...extra })
    .expect(202);
  const job = handbookImportJobSchema.parse(res.body);
  expect(job.status).toBe("queued");
  expect(job.queuePosition).toBe(1);
  await runHandbookImports(t);
  return handbookImportJobSchema.parse(
    (
      await t
        .http()
        .get(`/internal/v1/handbook/imports/${job.id}`)
        .set("authorization", editor)
        .expect(200)
    ).body,
  );
}

async function publish(note: string) {
  const draft = (await overview()).draft!;
  const res = await t
    .http()
    .post("/internal/v1/handbook/draft/publish")
    .set("authorization", editor)
    .send({ revision: draft.revision, note, actorName: "Lan" })
    .expect(200);
  return handbookPublishResultSchema.parse(res.body);
}

const web = async () => bearer(await t.serviceToken("web"));

describe("handbook permissions (ADR-0029)", () => {
  it("lets an auditor read but not edit, and a coordinator not publish", async () => {
    const auditor = bearer(await t.staffToken(["auditor"]));
    await t.http().get("/internal/v1/handbook").set("authorization", auditor).expect(200);
    await t
      .http()
      .post("/internal/v1/handbook/draft")
      .set("authorization", auditor)
      .send({ actorName: "A" })
      .expect(403);
    const coordinator = bearer(await t.staffToken(["coordinator"]));
    await t
      .http()
      .post("/internal/v1/handbook/draft/publish")
      .set("authorization", coordinator)
      .send({ revision: 1, note: "Thử", actorName: "C" })
      .expect(403);
  });

  it("serves the public book only to web, and nothing before the first publish", async () => {
    await t.http().get("/internal/v1/published-handbook").set("authorization", editor).expect(403);
    const res = await t
      .http()
      .get("/internal/v1/published-handbook")
      .set("authorization", await web())
      .expect(404);
    expect(res.body.code).toBe("handbook.not_published");
  });
});

describe("handbook editing, import and publishing", () => {
  it("imports a PDF into a draft, flags missing text, publishes with a note and alerts the team", async () => {
    await t
      .http()
      .post("/internal/v1/handbook/draft")
      .set("authorization", editor)
      .send({ actorName: "Lan" })
      .expect(201);
    // One draft at a time.
    await t
      .http()
      .post("/internal/v1/handbook/draft")
      .set("authorization", editor)
      .send({ actorName: "Lan" })
      .expect(409);

    const job = await importInto([await upload("pdf", fakePdf(TEXT))], "replace_all");
    expect(job.status).toBe("done");
    expect(job.total).toBe(3);
    expect(job.warnings).toContainEqual({ code: "missing_text", page: 2 });

    const draft = (await overview()).draft!;
    expect(draft.pages).toHaveLength(3);
    expect(draft.pages[1]!.missingText).toBe(true);
    expect(draft.pages[0]!.textSource).toBe("pdf");
    expect(t.storage.files.size).toBe(3);

    // The release note is required (D1).
    await t
      .http()
      .post("/internal/v1/handbook/draft/publish")
      .set("authorization", editor)
      .send({ revision: draft.revision, note: "", actorName: "Lan" })
      .expect(400);

    const result = await publish("Bản đầu tiên");
    expect(result.version.number).toBe(1);
    expect(t.audits.map((event) => event.action)).toEqual([]);
    await drainOutbox(t);
    expect(t.audits.map((event) => event.action)).toEqual(
      expect.arrayContaining(["handbook.import", "handbook.publish"]),
    );
    expect(t.alerts.at(-1)).toMatchObject({
      topic: "handbook_published",
      body: "Lan đã xuất bản Cẩm nang Xanh số phiên bản 1 — Bản đầu tiên",
      url: "/handbook/history",
    });
    expect(t.revalidations.at(-1)).toContain("content:handbook");
  });

  it("serves the published book without draft fields, finds pages without accents", async () => {
    const auth = await web();
    const book = publicHandbookSchema.parse(
      (await t.http().get("/internal/v1/published-handbook").set("authorization", auth).expect(200))
        .body,
    );
    expect(book.pages).toHaveLength(3);
    expect(book.pages[1]!.hasText).toBe(false);
    expect(JSON.stringify(book)).not.toMatch(/mediaId|revision|"note"|createdBy|publishedBy|draft/);

    const search = await t
      .http()
      .get("/internal/v1/published-handbook/search")
      .query({ q: "vo so" })
      .set("authorization", auth)
      .expect(200);
    expect(search.body.results.map((hit: { number: number }) => hit.number)).toEqual([1, 3]);

    const detail = publicHandbookPageDetailSchema.parse(
      (
        await t
          .http()
          .get(`/internal/v1/published-handbook/pages/${book.pages[2]!.key}`)
          .set("authorization", auth)
          .expect(200)
      ).body,
    );
    expect(detail.text).toContain("đổ khuôn");
    expect(detail.previous?.number).toBe(2);
    expect(detail.next).toBeNull();
  });

  it("keeps the published book unchanged while a draft is edited, and previews the draft", async () => {
    await t
      .http()
      .post("/internal/v1/handbook/draft")
      .set("authorization", editor)
      .send({ actorName: "Minh" })
      .expect(201);
    const draft = (await overview()).draft!;
    await t
      .http()
      .put("/internal/v1/handbook/draft/structure")
      .set("authorization", editor)
      .send({
        revision: draft.revision,
        title: "Cẩm nang mới",
        description: "",
        chapters: draft.chapters.map(({ id, title, tint }) => ({ id, title, tint })),
        pages: draft.pages.map(({ id, chapterId }) => ({ id, chapterId })),
      })
      .expect(200);
    // A stale revision is refused (optimistic lock).
    await t
      .http()
      .put("/internal/v1/handbook/draft/structure")
      .set("authorization", editor)
      .send({
        revision: draft.revision,
        title: "Cũ",
        description: "",
        chapters: draft.chapters.map(({ id, title, tint }) => ({ id, title, tint })),
        pages: [],
      })
      .expect(409);

    const auth = await web();
    const published = await t
      .http()
      .get("/internal/v1/published-handbook")
      .set("authorization", auth);
    expect(published.body.title).not.toBe("Cẩm nang mới");

    const token = (
      await t
        .http()
        .post("/internal/v1/handbook/draft/preview-tokens")
        .set("authorization", editor)
        .expect(201)
    ).body.token as string;
    const preview = await t
      .http()
      .get(`/internal/v1/published-handbook/previews/${token}`)
      .set("authorization", auth)
      .expect(200);
    expect(preview.body.title).toBe("Cẩm nang mới");
  });

  it("replaces one page, reuses identical images, and restores an older version", async () => {
    const before = (await overview()).draft!;
    const target = before.pages[1]!;
    const job = await importInto([await upload("image", await pageImage(200))], "replace_page", {
      pageId: target.id,
    });
    expect(job.status).toBe("done");
    const after = (await overview()).draft!;
    expect(after.pages[1]!.id).toBe(target.id);
    expect(after.pages[1]!.key).toBe(target.key);
    expect(after.pages[1]!.image.mediaId).not.toBe(target.image.mediaId);

    // The same PDF again stores nothing new: identical pages reuse their images.
    const stored = t.storage.files.size;
    await importInto([await upload("pdf", fakePdf(TEXT))], "replace_all");
    expect(t.storage.files.size).toBe(stored);

    expect((await publish("Thay trang 2")).version.number).toBe(2);

    const restore = await t
      .http()
      .post("/internal/v1/handbook/restore")
      .set("authorization", editor)
      .send({ number: 1, note: "Quay lại bản đầu", actorName: "Lan" })
      .expect(200);
    expect(restore.body.version.number).toBe(3);
    await drainOutbox(t);
    expect(t.alerts.at(-1)?.body).toContain("khôi phục Cẩm nang Xanh số về phiên bản 1");
    expect(t.audits.map((event) => event.action)).toContain("handbook.restore");

    const versions = (await overview()).versions;
    expect(versions.map((version) => [version.number, version.status])).toEqual([
      [3, "published"],
      [2, "archived"],
      [1, "archived"],
    ]);
  });

  it("refuses a file whose content does not match its kind, and reports an encrypted PDF", async () => {
    const created = (
      await t
        .http()
        .post("/internal/v1/handbook/uploads")
        .set("authorization", editor)
        .send({ kind: "pdf", fileName: "x.pdf", size: 100 })
        .expect(201)
    ).body as { id: string };
    const png = (await pageImage(1)).subarray(0, 100);
    const res = await t
      .http()
      .put(`/internal/v1/handbook/uploads/${created.id}/chunks/0`)
      .set("authorization", editor)
      .attach("chunk", png, "chunk")
      .expect(415);
    expect(res.body.code).toBe("handbook.file_type_invalid");

    await t
      .http()
      .post("/internal/v1/handbook/draft")
      .set("authorization", editor)
      .send({ actorName: "Lan" })
      .expect(201);
    const job = await importInto([await upload("pdf", fakePdf(TEXT, "ENCRYPTED"))], "append");
    expect(job).toMatchObject({ status: "failed", error: "pdf_encrypted" });

    // A server without poppler (a dev machine) says so instead of a generic failure.
    const noTools = await importInto([await upload("pdf", fakePdf(TEXT, "NO_TOOLS"))], "append");
    expect(noTools).toMatchObject({ status: "failed", error: "pdf_tools_missing" });
  });

  it("releases page images no kept version uses", async () => {
    const draft = (await overview()).draft!;
    await importInto([await upload("image", await pageImage(250))], "replace_page", {
      pageId: draft.pages[0]!.id,
    });
    // The image replaced in the draft only is now unused; cleanup waits 24 h for safety.
    const handbookEditor = t.app.get<HandbookEditor>(HANDBOOK_EDITOR);
    expect(await handbookEditor.cleanupMedia(new Date())).toBe(0);
    const released = await handbookEditor.cleanupMedia(new Date(Date.now() + 2 * 24 * 3600 * 1000));
    expect(released).toBeGreaterThanOrEqual(1);
    await drainOutbox(t);
  });

  it("takes covers outside the pages and keeps appendices at the end", async () => {
    const cover = await importInto([await upload("image", await pageImage(90))], "cover_front");
    expect(cover.status).toBe("done");
    expect(cover.warnings).toEqual([]);
    const back = await importInto([await upload("image", await pageImage(91))], "cover_back");
    expect(back.status).toBe("done");

    const draft = (await overview()).draft!;
    expect(draft.covers.front).not.toBeNull();
    expect(draft.covers.back).not.toBeNull();
    const pageCount = draft.pages.length;
    const [first, ...rest] = draft.chapters;
    const appendixId = "44444444-4444-4444-8444-444444444444";
    await t
      .http()
      .put("/internal/v1/handbook/draft/structure")
      .set("authorization", editor)
      .send({
        revision: draft.revision,
        title: draft.title,
        description: "",
        chapters: [
          { id: appendixId, title: "Phụ lục", tint: "paper", kind: "appendix" },
          ...[first!, ...rest].map(({ id, title, tint, kind }) => ({ id, title, tint, kind })),
        ],
        pages: draft.pages.map(({ id, chapterId }, i) => ({
          id,
          chapterId: i === draft.pages.length - 1 ? appendixId : chapterId,
        })),
      })
      .expect(200);

    await publish("Thêm bìa và phụ lục");
    const book = publicHandbookSchema.parse(
      (
        await t
          .http()
          .get("/internal/v1/published-handbook")
          .set("authorization", await web())
          .expect(200)
      ).body,
    );
    expect(book.covers.front).not.toBeNull();
    expect(book.covers.back).not.toBeNull();
    // Covers carry no page number: the pages are numbered as before.
    expect(book.pages).toHaveLength(pageCount);
    expect(book.pages[0]!.number).toBe(1);
    expect(book.chapters.at(-1)?.kind).toBe("appendix");
  });

  it("never logs page text or the publisher's name", () => {
    const logs = t.logs.join("\n");
    expect(logs).not.toContain("Vỏ sò được rửa sạch");
    expect(logs).not.toContain("Quay lại bản đầu");
  });
});
