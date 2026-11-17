import { describe, expect, it } from "vitest";

import type { ProductRecord, ProductRepository, VariantRecord } from "../../shop-catalog";
import type { CartItem, CartRecord } from "../domain/cart";
import { CartService, type CartRepository } from "./cart-service";

type FakeVariant = Pick<VariantRecord, "id" | "productId" | "status">;

/** Only the catalogue reads the cart uses; the rest of the port is never called here. */
function catalogue(variants: FakeVariant[], productStatus: ProductRecord["status"]) {
  const product = { id: "p1", status: productStatus };
  const repo = {
    findVariant: async (id: string) => variants.find((v) => v.id === id) ?? null,
    findById: async () => product,
    // Pricing is covered by the domain; returning nothing keeps these tests on storage.
    findVariants: async (ids: readonly string[]) => variants.filter((v) => ids.includes(v.id)),
    findByIds: async () => [],
  };
  return repo as unknown as ProductRepository;
}

function memory(items: CartItem[]) {
  let saved: CartItem[] = items;
  const record = (): CartRecord => ({ id: "c1", tokenHash: "h", userId: null, items: saved });
  const repo: CartRepository = {
    findByTokenHash: async () => record(),
    findByUser: async () => null,
    save: async (_hash, next) => {
      saved = next;
    },
    remove: async () => undefined,
  };
  return { repo, items: () => saved };
}

const at = new Date("2026-11-17T00:00:00Z");
const line = (variantId: string, quantity = 1): CartItem => ({ variantId, quantity, addedAt: at });

describe("CartService.setItem (UC-36)", () => {
  it("removes a line whose product is no longer published", async () => {
    const store = memory([line("v1"), line("v2")]);
    const variants = [
      { id: "v1", productId: "p1", status: "active" as const },
      { id: "v2", productId: "p1", status: "active" as const },
    ];
    const service = new CartService(store.repo, catalogue(variants, "archived"));
    await service.setItem("token", "v1", 0);
    expect(store.items().map((i) => i.variantId)).toEqual(["v2"]);
  });

  it("removes a line whose variant was archived", async () => {
    const store = memory([line("v1")]);
    const variants = [{ id: "v1", productId: "p1", status: "archived" as const }];
    const service = new CartService(store.repo, catalogue(variants, "published"));
    await service.setItem("token", "v1", 0);
    expect(store.items()).toEqual([]);
  });

  it("drops lines whose variant no longer exists", async () => {
    const store = memory([line("gone"), line("v1")]);
    const variants = [{ id: "v1", productId: "p1", status: "active" as const }];
    const service = new CartService(store.repo, catalogue(variants, "published"));
    await service.setItem("token", "v1", 2, at);
    expect(store.items()).toEqual([line("v1", 2)]);
  });

  it("still refuses to add something that is not for sale", async () => {
    const store = memory([]);
    const variants = [{ id: "v1", productId: "p1", status: "active" as const }];
    const service = new CartService(store.repo, catalogue(variants, "draft"));
    await expect(service.setItem("token", "v1", 1)).rejects.toMatchObject({
      code: "cart.unavailable",
    });
  });
});
