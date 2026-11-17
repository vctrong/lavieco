import { createHash } from "node:crypto";

import { DomainError } from "@lavieco/shared";
import { CART_LIMITS } from "@lavieco/shared/shop";

import type { ProductRepository } from "../../shop-catalog";
import { mergeItems, priceCart, type CartItem, type CartRecord } from "../domain/cart";

export const CART_REPOSITORY = Symbol("CART_REPOSITORY");

export interface CartRepository {
  findByTokenHash(tokenHash: string): Promise<CartRecord | null>;
  findByUser(userId: string): Promise<CartRecord | null>;
  /** Creates the cart on first write; refreshes its expiry on every write. */
  save(tokenHash: string, items: CartItem[], userId: string | null): Promise<void>;
  remove(id: string): Promise<void>;
}

const hash = (token: string) => createHash("sha256").update(token).digest("base64url");

/**
 * Carts of the shop (UC-36). Keyed by the opaque `lv_cart` cookie token (hash stored);
 * a member's cart is the cart of the device they last signed in on, merged with what
 * they had elsewhere. Carts never hold stock (BR-22).
 */
export class CartService {
  constructor(
    private readonly carts: CartRepository,
    private readonly products: ProductRepository,
  ) {}

  async view(token: string) {
    const cart = await this.carts.findByTokenHash(hash(token));
    return this.price(cart?.items ?? []);
  }

  async setItem(token: string, variantId: string, quantity: number, now = new Date()) {
    // Removing is always allowed: a line whose product was unpublished, archived or
    // deleted must not get stuck in the cart. Only adding or raising checks the catalogue.
    if (quantity > 0) {
      const variant = await this.products.findVariant(variantId);
      if (!variant || variant.status !== "active") throw new DomainError("cart.unavailable");
      const product = await this.products.findById(variant.productId);
      if (!product || product.status !== "published") throw new DomainError("cart.unavailable");
    }
    const cart = await this.carts.findByTokenHash(hash(token));
    const kept = await this.withoutMissing(cart?.items ?? []);
    const items = kept.filter((item) => item.variantId !== variantId);
    if (quantity > 0) {
      const previous = cart?.items.find((item) => item.variantId === variantId);
      items.push({ variantId, quantity, addedAt: previous?.addedAt ?? now });
    }
    if (items.length > CART_LIMITS.lines) throw new DomainError("cart.full");
    await this.carts.save(hash(token), items, cart?.userId ?? null);
    return this.price(items);
  }

  /** Signing in: this device's cart becomes the member's, with their other cart merged in. */
  async claim(token: string, userId: string) {
    const tokenHash = hash(token);
    const [current, previous] = await Promise.all([
      this.carts.findByTokenHash(tokenHash),
      this.carts.findByUser(userId),
    ]);
    let items = current?.items ?? [];
    if (previous && previous.tokenHash !== tokenHash) {
      items = mergeItems(items, previous.items);
      await this.carts.remove(previous.id);
    }
    await this.carts.save(tokenHash, items, userId);
    return this.price(items);
  }

  /** Lines bought: removed after an order is placed (S5). */
  async removeVariants(token: string, variantIds: readonly string[]) {
    const cart = await this.carts.findByTokenHash(hash(token));
    if (!cart) return;
    await this.carts.save(
      cart.tokenHash,
      cart.items.filter((item) => !variantIds.includes(item.variantId)),
      cart.userId,
    );
  }

  /**
   * Drops lines whose variant no longer exists. They are never shown, so without this
   * they would still count towards the line limit and could never be removed.
   */
  private async withoutMissing(items: readonly CartItem[]) {
    if (items.length === 0) return [];
    const found = new Set(
      (await this.products.findVariants(items.map((item) => item.variantId))).map((v) => v.id),
    );
    return items.filter((item) => found.has(item.variantId));
  }

  private async price(items: readonly CartItem[]) {
    const variants = await this.products.findVariants(items.map((item) => item.variantId));
    const products = await this.products.findByIds([...new Set(variants.map((v) => v.productId))]);
    return priceCart(
      items,
      new Map(variants.map((v) => [v.id, v])),
      new Map(products.map((p) => [p.id, p])),
    );
  }
}
