import { describe, expect, it } from "vitest";

import {
  buildImages,
  imageIds,
  imagesToAttach,
  releasedImageIds,
  type EventImages,
} from "./event-images";

const file = (id: string) => ({ publicId: `lavieco/dev/events/${id}`, width: 10, height: 5 });
const snap = (id: string, alt = "a") => ({ mediaId: id, ...file(id), alt });

const current: EventImages = { cover: snap("c1"), gallery: [snap("g1"), snap("g2")] };

describe("event images (ADR-0020)", () => {
  it("lists held ids once, cover first", () => {
    expect(imageIds({ cover: snap("x"), gallery: [snap("x"), snap("y")] })).toEqual(["x", "y"]);
  });

  it("attaches only images the event does not hold yet", () => {
    const input = {
      cover: { mediaId: "c2", alt: "new" },
      gallery: [
        { mediaId: "g1", alt: "kept" },
        { mediaId: "g3", alt: "new" },
        { mediaId: "g3", alt: "twice" },
      ],
    };
    expect(imagesToAttach(current, input)).toEqual([
      { mediaId: "c2", purpose: "event_cover" },
      { mediaId: "g3", purpose: "event_gallery" },
    ]);
  });

  it("builds snapshots from held files and attach results, alt from the input", () => {
    const built = buildImages(
      current,
      { cover: { mediaId: "c2", alt: "Bìa" }, gallery: [{ mediaId: "g1", alt: "Mới" }] },
      new Map([["c2", file("c2")]]),
    );
    expect(built).toEqual({ cover: snap("c2", "Bìa"), gallery: [snap("g1", "Mới")] });
  });

  it("releases what is no longer used, including a cover moved out", () => {
    const after: EventImages = { cover: snap("g1"), gallery: [snap("g2")] };
    expect(releasedImageIds(current, after)).toEqual(["c1"]);
    expect(releasedImageIds(current, { cover: null, gallery: [] })).toEqual(["c1", "g1", "g2"]);
    expect(releasedImageIds(current, current)).toEqual([]);
  });
});
