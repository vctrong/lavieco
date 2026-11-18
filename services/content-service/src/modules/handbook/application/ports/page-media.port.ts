export const HANDBOOK_PAGE_MEDIA = Symbol("HANDBOOK_PAGE_MEDIA");

/** What the handbook needs from the `media` module (implemented by `MediaService`). */
export interface HandbookPageMedia {
  storeHandbookPage(
    bytes: Uint8Array,
    handbookId: string,
    actor: { kind: "staff"; userId: string },
  ): Promise<{
    record: { id: string; publicId: string; width: number; height: number };
    reused: boolean;
  }>;
  listHandbookPageIds(cutoff: Date): Promise<string[]>;
  releaseHandbookPages(ids: readonly string[], now?: Date): Promise<number>;
}
