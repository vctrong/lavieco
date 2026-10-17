import { Types } from "mongoose";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";

import { mediaSchema, memberAvatarSchema } from "@lavieco/shared/media";

import {
  bearer,
  createTestApp,
  drainOutbox,
  sweepPending,
  type TestApp,
} from "../support/test-app";

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp(inject("mongoUri"));
});

afterAll(async () => {
  await t?.close();
});

beforeEach(() => {
  t.storage.failUploads = false;
});

const grey = { r: 120, g: 130, b: 140 };

/** A small JPEG with camera and GPS EXIF, as a phone would send it. */
async function phonePhoto(width = 64, height = 48) {
  return sharp({ create: { width, height, channels: 3, background: grey } })
    .jpeg()
    .withExifMerge({
      IFD0: { Make: "TestCam", Model: "T1" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "10/1 2/1 0/1" },
    })
    .toBuffer();
}

/** Bytes that start like a JPEG but are not one: passes the sniff, fails decoding. */
function fakeJpeg(size: number) {
  const bytes = Buffer.alloc(size, 7);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  return bytes;
}

function heicHeader() {
  const box = Buffer.alloc(32);
  box.writeUInt32BE(24, 0);
  box.write("ftypheic", 4, "latin1");
  box.write("mif1heic", 16, "latin1");
  return box;
}

async function coordinator() {
  return bearer(await t.staffToken(["coordinator"]));
}

function uploadEventImage(
  auth: string,
  file: Buffer,
  filename = "photo.jpg",
  purpose = "event_cover",
) {
  return t
    .http()
    .post("/internal/v1/media/event-images")
    .set("authorization", auth)
    .field("purpose", purpose)
    .attach("file", file, filename);
}

const statusOf = async (id: string) =>
  (await t.db.collection("media").findOne({ _id: new Types.ObjectId(id) }))?.status;

describe("event image upload (ADR-0020)", () => {
  it("stores a cleaned image without EXIF under lavieco/<env>/events, pending", async () => {
    const res = await uploadEventImage(await coordinator(), await phonePhoto()).expect(201);
    const media = mediaSchema.parse(res.body);
    expect(media).toMatchObject({ purpose: "event_cover", width: 64, height: 48, format: "jpeg" });
    expect(media.publicId).toBe(`lavieco/dev/events/${media.id}`);

    const stored = t.storage.files.get(media.publicId);
    expect(stored).toBeDefined();
    expect((await sharp(stored!).metadata()).exif).toBeUndefined();
    expect(stored!.includes(Buffer.from("TestCam"))).toBe(false);
    expect(await statusOf(media.id)).toBe("pending");
    // The contract view exposes no uploader, owner, hash or lifecycle field.
    expect(Object.keys(res.body).sort()).toEqual(
      ["bytes", "format", "height", "id", "publicId", "purpose", "width"].sort(),
    );
  });

  it("judges by content, not by name: a PNG called .jpg is a PNG, an SVG called .png is refused", async () => {
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: grey } })
      .png()
      .toBuffer();
    const asJpg = await uploadEventImage(await coordinator(), png, "x.jpg").expect(201);
    expect(asJpg.body.format).toBe("png");

    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
    const refused = await uploadEventImage(await coordinator(), svg, "x.png").expect(415);
    expect(refused.body.code).toBe("media.type_unsupported");
  });

  it("names HEIC so the admin can explain it", async () => {
    const res = await uploadEventImage(await coordinator(), heicHeader(), "IMG_0001.HEIC").expect(
      415,
    );
    expect(res.body).toMatchObject({ code: "media.format_refused", detail: "heic" });
  });

  it("refuses files over 8 MB and bytes that do not decode", async () => {
    const tooBig = await uploadEventImage(
      await coordinator(),
      fakeJpeg(8 * 1024 * 1024 + 1),
    ).expect(413);
    expect(tooBig.body.code).toBe("media.too_large");
    const broken = await uploadEventImage(await coordinator(), fakeJpeg(3 * 1024 * 1024)).expect(
      422,
    );
    expect(broken.body.code).toBe("media.image_invalid");
  });

  it("requires program:write; member and service tokens are refused", async () => {
    const photo = await phonePhoto();
    await uploadEventImage(bearer(await t.staffToken(["content_editor"])), photo).expect(403);
    await uploadEventImage(bearer(await t.staffToken(["auditor"])), photo).expect(403);
    await uploadEventImage(bearer(await t.memberToken()), photo).expect(401);
    await uploadEventImage(bearer(await t.serviceToken("admin")), photo).expect(401);
    await t.http().post("/internal/v1/media/event-images").expect(401);
    expect(t.storage.files.size).toBeGreaterThan(0);
  });

  it("answers 503 when Cloudinary fails, and writes no record", async () => {
    const before = await t.db.collection("media").countDocuments();
    t.storage.failUploads = true;
    const res = await uploadEventImage(await coordinator(), await phonePhoto()).expect(503);
    expect(res.body.code).toBe("common.unavailable");
    expect(await t.db.collection("media").countDocuments()).toBe(before);
  });
});

describe("attach and release by program-service", () => {
  const eventA = { kind: "event", id: new Types.ObjectId().toHexString() };
  const eventB = { kind: "event", id: new Types.ObjectId().toHexString() };

  async function program() {
    return bearer(await t.serviceToken("program-service"));
  }

  it("attaches once per event, refuses another event, releases and deletes the file", async () => {
    const uploaded = mediaSchema.parse(
      (await uploadEventImage(await coordinator(), await phonePhoto())).body,
    );
    const attach = (ref: typeof eventA) =>
      t
        .http()
        .post(`/internal/v1/media/${uploaded.id}/attach`)
        .send({ purpose: "event_gallery", ref });

    const first = await attach(eventA)
      .set("authorization", await program())
      .expect(200);
    expect(mediaSchema.parse(first.body)).toMatchObject({
      id: uploaded.id,
      publicId: uploaded.publicId,
      purpose: "event_gallery",
    });
    await attach(eventA)
      .set("authorization", await program())
      .expect(200);
    const other = await attach(eventB)
      .set("authorization", await program())
      .expect(409);
    expect(other.body.code).toBe("media.unavailable");
    await attach(eventA)
      .set("authorization", bearer(await t.serviceToken("web")))
      .expect(403);
    await attach(eventA)
      .set("authorization", await coordinator())
      .expect(403);

    const release = (ref: typeof eventA) =>
      t.http().post(`/internal/v1/media/${uploaded.id}/release`).send({ ref });
    await release(eventB)
      .set("authorization", await program())
      .expect(409);
    await release(eventA)
      .set("authorization", await program())
      .expect(204);
    await release(eventA)
      .set("authorization", await program())
      .expect(204);
    expect(await statusOf(uploaded.id)).toBe("deleted");
    expect(t.storage.files.has(uploaded.publicId)).toBe(true);

    await drainOutbox(t);
    expect(t.storage.files.has(uploaded.publicId)).toBe(false);
    const doc = await t.db.collection("media").findOne({ _id: new Types.ObjectId(uploaded.id) });
    expect(doc?.storageDeletedAt).toBeInstanceOf(Date);

    // A deleted image can never come back.
    await attach(eventA)
      .set("authorization", await program())
      .expect(409);
  });

  it("sweeps uploads left pending for more than 24 hours, and only those", async () => {
    const stale = mediaSchema.parse(
      (await uploadEventImage(await coordinator(), await phonePhoto())).body,
    );
    const fresh = mediaSchema.parse(
      (await uploadEventImage(await coordinator(), await phonePhoto())).body,
    );
    const kept = mediaSchema.parse(
      (await uploadEventImage(await coordinator(), await phonePhoto())).body,
    );
    await t
      .http()
      .post(`/internal/v1/media/${kept.id}/attach`)
      .set("authorization", await program())
      .send({ purpose: "event_cover", ref: eventA })
      .expect(200);
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await t.db
      .collection("media")
      .updateMany(
        { _id: { $in: [stale.id, kept.id].map((id) => new Types.ObjectId(id)) } },
        { $set: { createdAt: old } },
      );

    expect(await sweepPending(t)).toBeGreaterThanOrEqual(1);
    await drainOutbox(t);
    expect(await statusOf(stale.id)).toBe("deleted");
    expect(t.storage.files.has(stale.publicId)).toBe(false);
    expect(await statusOf(fresh.id)).toBe("pending");
    expect(await statusOf(kept.id)).toBe("attached");
    expect(t.storage.files.has(kept.publicId)).toBe(true);
  });
});

describe("member avatar", () => {
  const memberId = new Types.ObjectId().toHexString();

  async function member(userId = memberId) {
    return bearer(await t.memberToken(userId));
  }

  const putAvatar = (file: Buffer, auth: string, filename = "me.jpg") =>
    t
      .http()
      .put("/internal/v1/members/me/avatar")
      .set("authorization", auth)
      .attach("file", file, filename);

  it("replaces the avatar and deletes the old file; removing it deletes the file too", async () => {
    const empty = await t
      .http()
      .get("/internal/v1/members/me/avatar")
      .set("authorization", await member())
      .expect(200);
    expect(memberAvatarSchema.parse(empty.body).avatar).toBeNull();

    const first = memberAvatarSchema.parse(
      (await putAvatar(await phonePhoto(), await member()).expect(200)).body,
    ).avatar!;
    expect(first.publicId).toBe(`lavieco/dev/avatars/${first.id}`);
    const second = memberAvatarSchema.parse(
      (await putAvatar(await phonePhoto(32, 32), await member()).expect(200)).body,
    ).avatar!;
    expect(second.id).not.toBe(first.id);
    await drainOutbox(t);
    expect(t.storage.files.has(first.publicId)).toBe(false);
    expect(t.storage.files.has(second.publicId)).toBe(true);

    const current = await t
      .http()
      .get("/internal/v1/members/me/avatar")
      .set("authorization", await member())
      .expect(200);
    expect(current.body.avatar.id).toBe(second.id);

    // Another member sees only their own (empty) avatar.
    const someoneElse = await t
      .http()
      .get("/internal/v1/members/me/avatar")
      .set("authorization", await member(new Types.ObjectId().toHexString()))
      .expect(200);
    expect(someoneElse.body.avatar).toBeNull();

    await t
      .http()
      .delete("/internal/v1/members/me/avatar")
      .set("authorization", await member())
      .expect(200, { avatar: null });
    await drainOutbox(t);
    expect(t.storage.files.has(second.publicId)).toBe(false);
  });

  it("caps avatars at 2 MB and refuses AVIF by name", async () => {
    const tooBig = await putAvatar(fakeJpeg(2 * 1024 * 1024 + 1), await member()).expect(413);
    expect(tooBig.body.code).toBe("media.too_large");
    const avif = Buffer.alloc(32);
    avif.writeUInt32BE(24, 0);
    avif.write("ftypavif", 4, "latin1");
    avif.write("mif1miaf", 16, "latin1");
    const refused = await putAvatar(avif, await member(), "me.avif").expect(415);
    expect(refused.body).toMatchObject({ code: "media.format_refused", detail: "avif" });
  });

  it("is for members only", async () => {
    await putAvatar(await phonePhoto(), await coordinator()).expect(401);
    await putAvatar(await phonePhoto(), bearer(await t.serviceToken("web"))).expect(401);
  });

  it("erases every avatar record of a member for account deletion (UC-29)", async () => {
    const userId = new Types.ObjectId().toHexString();
    const avatar = memberAvatarSchema.parse(
      (await putAvatar(await phonePhoto(), await member(userId)).expect(200)).body,
    ).avatar!;
    await t
      .http()
      .delete(`/internal/v1/members/${userId}/media`)
      .set("authorization", bearer(await t.serviceToken("web")))
      .expect(403);
    await t
      .http()
      .delete(`/internal/v1/members/${userId}/media`)
      .set("authorization", bearer(await t.serviceToken("identity-service")))
      .expect(204);
    await drainOutbox(t);
    expect(t.storage.files.has(avatar.publicId)).toBe(false);
    expect(await t.db.collection("media").countDocuments({ "owner.userId": userId })).toBe(0);
  });
});

describe("logs", () => {
  it("never contain the Cloudinary secret", () => {
    expect(t.logs.join("\n")).not.toContain("test-secret-never-logged");
  });
});
