import { describe, expect, it } from "vitest";

import {
  NO_IMAGES,
  buildImages,
  imageIds,
  imagesToAttach,
  releasedImageIds,
  type EventImages,
  type EventImagesInput,
} from "./event-images";

const file = (id: string) => ({ publicId: `lavieco/dev/events/${id}`, width: 10, height: 5 });
const snap = (id: string, alt = "a") => ({ mediaId: id, ...file(id), alt });
const ref = (id: string, alt = "a") => ({ mediaId: id, alt });

const current: EventImages = {
  cover: snap("c1"),
  banner: snap("b1"),
  gallery: [snap("g1"), snap("g2")],
  avatars: [snap("a1"), null],
};

const input = (overrides: Partial<EventImagesInput> = {}): EventImagesInput => ({
  cover: null,
  banner: null,
  gallery: [],
  avatars: [],
  ...overrides,
});

describe("event images (ADR-0020)", () => {
  it("lists held ids once, cover first", () => {
    expect(imageIds({ ...NO_IMAGES, cover: snap("x"), gallery: [snap("x"), snap("y")] })).toEqual([
      "x",
      "y",
    ]);
    expect(imageIds(current)).toEqual(["c1", "b1", "g1", "g2", "a1"]);
  });

  it("attaches only images the event does not hold yet; single images use event_cover", () => {
    const wanted = input({
      cover: ref("c2", "new"),
      banner: ref("b1", "kept"),
      gallery: [ref("g1", "kept"), ref("g3", "new"), ref("g3", "twice")],
      avatars: [ref("a2"), null],
    });
    expect(imagesToAttach(current, wanted)).toEqual([
      { mediaId: "c2", purpose: "event_cover" },
      { mediaId: "a2", purpose: "event_cover" },
      { mediaId: "g3", purpose: "event_gallery" },
    ]);
  });

  it("builds snapshots from held files and attach results, alt from the input", () => {
    const built = buildImages(
      current,
      input({
        cover: ref("c2", "Poster"),
        banner: ref("b1", "Banner"),
        gallery: [ref("g1", "Mới")],
        avatars: [null, ref("a1", "Chân dung")],
      }),
      new Map([["c2", file("c2")]]),
    );
    expect(built).toEqual({
      cover: snap("c2", "Poster"),
      banner: snap("b1", "Banner"),
      gallery: [snap("g1", "Mới")],
      avatars: [null, snap("a1", "Chân dung")],
    });
  });

  it("releases what is no longer used, including a cover moved out", () => {
    const after: EventImages = { ...NO_IMAGES, cover: snap("g1"), gallery: [snap("g2")] };
    expect(releasedImageIds(current, after)).toEqual(["c1", "b1", "a1"]);
    expect(releasedImageIds(current, NO_IMAGES)).toEqual(["c1", "b1", "g1", "g2", "a1"]);
    expect(releasedImageIds(current, current)).toEqual([]);
  });
});
