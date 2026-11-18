import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceProblemError, ServiceUnavailableError } from "@lavieco/api-clients";

const getPublishedHandbookPage = vi.fn();
const warn = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/services", () => ({
  contentClient: () => ({ getPublishedHandbookPage }),
  webLogger: () => ({ warn }),
}));

const { handbookPagePassage } = await import("./handbook-knowledge-source");

const detail = (text: string) => ({
  page: { number: 12, title: "Chậu cây vỏ sò", alt: "Chậu cây làm từ bột vỏ sò" },
  chapter: { title: "Tự tay làm" },
  text,
});

beforeEach(() => {
  getPublishedHandbookPage.mockReset();
  warn.mockReset();
});

describe("handbookPagePassage", () => {
  it("gives the published page text with where it comes from", async () => {
    getPublishedHandbookPage.mockResolvedValue(detail("Trộn bột vỏ sò với keo tự nhiên."));
    const passage = await handbookPagePassage("0w0k4yje");
    expect(getPublishedHandbookPage).toHaveBeenCalledWith("0w0k4yje");
    expect(passage?.source).toContain("trang 12: Chậu cây vỏ sò");
    expect(passage?.text).toBe("Trộn bột vỏ sò với keo tự nhiên.");
  });

  it("falls back to the image description for a page without text", async () => {
    getPublishedHandbookPage.mockResolvedValue(detail(""));
    expect((await handbookPagePassage("0w0k4yje"))?.text).toContain("Chậu cây làm từ bột vỏ sò");
  });

  it("answers without the page when it is unknown or the service is down", async () => {
    getPublishedHandbookPage.mockRejectedValue(
      new ServiceProblemError({
        type: "about:blank",
        title: "x",
        status: 404,
        code: "common.not_found",
      }),
    );
    expect(await handbookPagePassage("0w0k4yje")).toBeNull();
    expect(warn).not.toHaveBeenCalled();
    getPublishedHandbookPage.mockRejectedValue(new ServiceUnavailableError("unreachable"));
    expect(await handbookPagePassage("0w0k4yje")).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });
});
