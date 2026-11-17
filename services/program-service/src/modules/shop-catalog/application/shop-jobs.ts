import type { OutboxPort, TxContext } from "@lavieco/service-kit/ports";

/** Outbox job: drop `web`'s cached shop list and the page of one product (payload `{ slug }`). */
export const REVALIDATE_PRODUCT_JOB = "web.revalidate_product";

/** Outbox job: give a product image back to content-service (payload `{ mediaId, productId }`). */
export const RELEASE_PRODUCT_MEDIA_JOB = "shop.media_release";

/** Outbox job: drop whole shop cache tags (payload `{ tags }`, comma separated). */
export const REVALIDATE_SHOP_TAGS_JOB = "web.revalidate_shop_tags";

export function queueShopTags(outbox: OutboxPort, tx: TxContext, tags: readonly string[]) {
  return outbox.enqueue(tx, { type: REVALIDATE_SHOP_TAGS_JOB, payload: { tags: tags.join(",") } });
}

/** Same transaction as the change (S5); slugs only, no personal data. */
export async function queueProductRevalidation(
  outbox: OutboxPort,
  tx: TxContext,
  slugs: readonly string[],
) {
  for (const slug of new Set(slugs)) {
    await outbox.enqueue(tx, { type: REVALIDATE_PRODUCT_JOB, payload: { slug } });
  }
}

export async function queueProductMediaRelease(
  outbox: OutboxPort,
  tx: TxContext,
  productId: string,
  mediaIds: readonly string[],
) {
  for (const mediaId of mediaIds) {
    await outbox.enqueue(tx, { type: RELEASE_PRODUCT_MEDIA_JOB, payload: { mediaId, productId } });
  }
}
