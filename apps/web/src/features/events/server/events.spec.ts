import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceProblemError, ServiceUnavailableError } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";

const getPublishedEvent = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/services", () => ({
  programClient: () => ({ getPublishedEvent }),
  webLogger: () => ({ warn: vi.fn() }),
}));

const { getEvent } = await import("./events");

const problem = (status: number, code: ErrorCode) =>
  new ServiceProblemError({ type: "about:blank", title: "x", status, code });

beforeEach(() => {
  getPublishedEvent.mockReset();
});

// `/chuong-trinh/<slug>` must answer 404 for any slug that is not a published event,
// whatever its shape: the page calls notFound() when getEvent gives null.
describe("getEvent", () => {
  it("gives null for an unknown slug (404 from the service)", async () => {
    getPublishedEvent.mockRejectedValue(problem(404, "common.not_found"));
    expect(await getEvent("khong-ton-tai")).toBeNull();
  });

  // Odd slugs (accents, symbols, too long, an ObjectId) fail the service's slug check.
  it.each(["chương-trình", "a/b", "<script>", "6650a1b2c3d4e5f6a7b8c9d0", "a".repeat(200)])(
    "gives null for a slug the service refuses (%s)",
    async (slug) => {
      getPublishedEvent.mockRejectedValue(problem(400, "common.validation_failed"));
      expect(await getEvent(slug)).toBeNull();
    },
  );

  // A real outage is not "not found": search engines must not drop live pages, so the
  // error page answers 500 instead.
  it("throws when program-service is down", async () => {
    getPublishedEvent.mockRejectedValue(new ServiceUnavailableError("program-service unreachable"));
    await expect(getEvent("workshop")).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});
