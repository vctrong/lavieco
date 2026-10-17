import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { eventTypeListSchema, publicEventTypeListSchema } from "@lavieco/shared/events";

import { runMigrations } from "../../cli/migrate";
import { bearer, createTestApp, type TestApp } from "../support/test-app";

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp(inject("mongoUri"));
});

afterAll(async () => {
  await t?.close();
});

describe("event types", () => {
  it("seeds Workshop, Talkshow, Triển lãm once, even when migrations run again", async () => {
    await t.db.collection("migrations_applied").deleteMany({});
    await runMigrations(t.db);
    const res = await t
      .http()
      .get("/internal/v1/event-types")
      .set("authorization", bearer(await t.staffToken(["auditor"])))
      .expect(200);
    const list = eventTypeListSchema.parse(res.body);
    expect(list.items.map((type) => type.key)).toEqual(["workshop", "talkshow", "trien-lam"]);
  });

  it("creates, renames, archives; archived types leave the public list", async () => {
    const coordinator = bearer(await t.staffToken(["coordinator"]));
    const created = await t
      .http()
      .post("/internal/v1/event-types")
      .set("authorization", coordinator)
      .send({ name: { vi: "Lớp học trải nghiệm" } })
      .expect(201);
    expect(created.body.key).toBe("lop-hoc-trai-nghiem");

    const duplicate = await t
      .http()
      .post("/internal/v1/event-types")
      .set("authorization", coordinator)
      .send({ name: { vi: "Lớp học  trải nghiệm" } })
      .expect(409);
    expect(duplicate.body.code).toBe("event_type.name_taken");

    const archived = await t
      .http()
      .patch(`/internal/v1/event-types/${created.body.id}`)
      .set("authorization", coordinator)
      .send({ revision: 1, archived: true, name: { vi: "Lớp trải nghiệm" } })
      .expect(200);
    expect(archived.body).toMatchObject({
      archived: true,
      revision: 2,
      key: "lop-hoc-trai-nghiem",
    });

    const stale = await t
      .http()
      .patch(`/internal/v1/event-types/${created.body.id}`)
      .set("authorization", coordinator)
      .send({ revision: 1, archived: false })
      .expect(409);
    expect(stale.body.code).toBe("common.conflict");

    const publicList = await t
      .http()
      .get("/internal/v1/public-event-types")
      .set("authorization", bearer(await t.serviceToken("web")))
      .expect(200);
    const keys = publicEventTypeListSchema.parse(publicList.body).items.map((type) => type.key);
    expect(keys).not.toContain("lop-hoc-trai-nghiem");
  });

  it("refuses writes without program:write, and member or wrong-audience tokens", async () => {
    const body = { name: { vi: "Tọa đàm" } };
    for (const role of ["auditor", "content_editor"] as const) {
      await t
        .http()
        .post("/internal/v1/event-types")
        .set("authorization", bearer(await t.staffToken([role])))
        .send(body)
        .expect(403);
    }
    await t
      .http()
      .get("/internal/v1/event-types")
      .set("authorization", bearer(await t.memberToken()))
      .expect(401);
    await t
      .http()
      .get("/internal/v1/public-event-types")
      .set("authorization", bearer(await t.serviceToken("web", "content-service")))
      .expect(401);
    await t
      .http()
      .get("/internal/v1/public-event-types")
      .set("authorization", bearer(await t.serviceToken("admin")))
      .expect(403);
    await t.http().get("/internal/v1/event-types").expect(401);
  });
});
