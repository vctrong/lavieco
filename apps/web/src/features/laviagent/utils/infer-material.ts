import type { Material, MaterialId } from "../types";
import { normalizeSearchText } from "./normalize-search-text";

/**
 * The material a chat message talks about ("mình có nhiều lon bia" → aluminum_can),
 * from the keywords in materials.json. Whole words only; the longest keyword wins, so
 * "chai thủy tinh" is glass, not plastic. Null when nothing matches.
 */
export function inferMaterial(
  text: string,
  materials: readonly Pick<Material, "id" | "keywords">[],
): MaterialId | null {
  const haystack = ` ${normalizeSearchText(text)} `;
  let best: { id: MaterialId; length: number } | null = null;
  for (const material of materials) {
    for (const keyword of material.keywords) {
      const needle = normalizeSearchText(keyword);
      if (needle && haystack.includes(` ${needle} `) && (!best || needle.length > best.length)) {
        best = { id: material.id, length: needle.length };
      }
    }
  }
  return best?.id ?? null;
}
