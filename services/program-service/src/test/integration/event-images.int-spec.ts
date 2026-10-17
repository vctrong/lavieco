import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";

import { eventSchema, publicEventDetailSchema, type EventView } from "@lavieco/shared/events";

import { bearer, createTestApp, drainOutbox, type TestApp } from "../support/test-app";

let t: TestApp;
let workshopTypeId: string;

const DAY_MS = 86_400_000;
const inDays = (days: number, hours = 0) =>
  new Date(Date.now() + days * DAY_MS + hours * 3_600_000).toISOString();

beforeAll(async () => {
  t = await createTestApp(inject("mongoUri"), {
    revalidateFetch: async () => new Response(null, { status: 204 }),
  });
  const types = await t
    .http()
    .get("/internal/v1/event-types")
    .set("authorization", bearer(await t.staffToken(["coordinator"])));
  workshopTypeId = types.body.items.find((type: { key: string }) => type.key === "workshop").id;
});

afterAll(async () => {
  await t?.close();
});

beforeEach(() => {
  t.media.unavailable = false;
  t.media.released.length = 0;
});

const coordinator = async () => bearer(await t.staffToken(["coordinator"]));
const image = (mediaId: string, alt = "Bàn làm việc của xưởng") => ({ mediaId, alt });

function details(overrides: Record<string, unknown> = {}) {
  return {
    title: "Workshop làm chậu cây từ bột vỏ sò",
    typeId: workshopTypeId,
    format: "offline",
    startAt: inDays(20),
    endAt: inDays(20, 3),
    venue: { name: "Xưởng LAVIECO", address: "Ninh Kiều, Cần Thơ" },
    ...overrides,
  };
}

async function create(overrides: Record<string, unknown> = {}, status = 201) {
  return t
    .http()
    .post("/internal/v1/events")
    .set("authorization", await coordinator())
    .send(details(overrides))
    .expect(status);
}

async function update(event: EventView, overrides: Record<string, unknown>, status = 200) {
  return t
    .http()
    .put(`/internal/v1/events/${event.id}`)
    .set("authorization", await coordinator())
    .send({ ...details(overrides), revision: event.revision })
    .expect(status);
}

describe("event cover and gallery (ADR-0020)", () => {
  it("attaches uploaded images on create and stores their snapshots", async () => {
    const cover = t.media.upload();
    const photo = t.media.upload();
    const event = eventSchema.parse(
      (await create({ cover: image(cover), gallery: [image(photo, "Thành phẩm")] })).body,
    );
    expect(event.cover).toEqual({
      mediaId: cover,
      publicId: `lavieco/dev/events/${cover}`,
      width: 1600,
      height: 900,
      alt: "Bàn làm việc của xưởng",
    });
    expect(event.gallery.map((item) => [item.mediaId, item.alt])).toEqual([[photo, "Thành phẩm"]]);
    expect(t.media.holderOf(cover)).toBe(event.id);
  });

  it("releases a replaced cover and a removed photo, keeps the rest, then deletes nothing twice", async () => {
    const [oldCover, newCover, kept, removed] = [1, 2, 3, 4].map(() => t.media.upload());
    const event = eventSchema.parse(
      (
        await create({
          cover: image(oldCover!),
          gallery: [image(kept!), image(removed!)],
        })
      ).body,
    );
    const updated = eventSchema.parse(
      (
        await update(event, {
          cover: image(newCover!, "Ảnh bìa mới"),
          gallery: [image(kept!, "Chú thích mới")],
        })
      ).body,
    );
    expect(updated.cover?.mediaId).toBe(newCover);
    expect(updated.gallery).toEqual([
      expect.objectContaining({ mediaId: kept, alt: "Chú thích mới" }),
    ]);

    // Released through the outbox, in the same transaction as the save.
    expect(t.media.released).toEqual([]);
    await drainOutbox(t);
    expect(t.media.released.map((item) => item.mediaId).sort()).toEqual([oldCover, removed].sort());
    expect(t.media.released.every((item) => item.eventId === event.id)).toBe(true);
  });

  it("refuses an image that is gone or belongs to another event, and saves nothing", async () => {
    const shared = t.media.upload();
    const owner = eventSchema.parse((await create({ cover: image(shared) })).body);
    const res = await create({ title: "Chương trình khác", cover: image(shared) }, 409);
    expect(res.body.code).toBe("media.unavailable");

    const unknown = await update(owner, { cover: image("64b7f0c2a1b2c3d4e5f60799") }, 409);
    expect(unknown.body.code).toBe("media.unavailable");
    const unchanged = await t
      .http()
      .get(`/internal/v1/events/${owner.id}`)
      .set("authorization", await coordinator())
      .expect(200);
    expect(unchanged.body.cover.mediaId).toBe(shared);
  });

  it("answers 503 when content-service is down", async () => {
    t.media.unavailable = true;
    const res = await create({ cover: image(t.media.upload()) }, 503);
    expect(res.body.code).toBe("common.unavailable");
  });

  it("caps the gallery at 12 and requires alt text", async () => {
    const thirteen = Array.from({ length: 13 }, () => image(t.media.upload()));
    await create({ gallery: thirteen }, 400);
    await create({ cover: { mediaId: t.media.upload(), alt: "" } }, 400);
  });

  it("releases every image of a discarded draft; a duplicate starts without images", async () => {
    const cover = t.media.upload();
    const photo = t.media.upload();
    const event = eventSchema.parse(
      (await create({ cover: image(cover), gallery: [image(photo)] })).body,
    );
    const copy = await t
      .http()
      .post(`/internal/v1/events/${event.id}/duplicate`)
      .set("authorization", await coordinator())
      .expect(201);
    expect(copy.body).toMatchObject({ cover: null, gallery: [] });

    await t
      .http()
      .post(`/internal/v1/events/${event.id}/discard`)
      .set("authorization", await coordinator())
      .send({ revision: event.revision })
      .expect(204);
    await drainOutbox(t);
    expect(t.media.released.map((item) => item.mediaId).sort()).toEqual([cover, photo].sort());
  });

  it("shows cover and gallery publicly, as snapshots", async () => {
    const cover = t.media.upload();
    const photo = t.media.upload();
    const event = eventSchema.parse(
      (await create({ title: "Có ảnh", cover: image(cover), gallery: [image(photo)] })).body,
    );
    await t
      .http()
      .post(`/internal/v1/events/${event.id}/ticket-types`)
      .set("authorization", await coordinator())
      .send({ name: "Vé", price: 0, quantity: 10, maxPerOrder: 2 })
      .expect(201);
    await t
      .http()
      .post(`/internal/v1/events/${event.id}/status`)
      .set("authorization", await coordinator())
      .send({ action: "publish", revision: event.revision })
      .expect(200);
    const res = await t
      .http()
      .get(`/internal/v1/published-events/${event.slug}`)
      .set("authorization", bearer(await t.serviceToken("web")))
      .expect(200);
    const detail = publicEventDetailSchema.parse(res.body);
    expect(detail.cover?.publicId).toBe(`lavieco/dev/events/${cover}`);
    expect(detail.gallery.map((item) => item.mediaId)).toEqual([photo]);
  });
});
