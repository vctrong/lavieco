/**
 * Sharing a page (D6): the system share sheet on phones (Zalo, Messenger… are there),
 * otherwise the address is copied. The shared address is the page's own reading
 * page (`/cam-nang/trang/<key>`), which has a preview image for chat apps.
 */
export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export async function sharePage(input: {
  url: string;
  title: string;
  text: string;
}): Promise<ShareOutcome> {
  const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  if (touch && typeof navigator.share === "function") {
    try {
      await navigator.share(input);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // Fall through to copying.
    }
  }
  try {
    await navigator.clipboard.writeText(input.url);
    return "copied";
  } catch {
    return "failed";
  }
}
