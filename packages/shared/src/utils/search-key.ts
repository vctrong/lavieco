/**
 * Accent-insensitive matching key (`search.key`, docs/03 §1.2): lower-case, Vietnamese
 * diacritics removed, `đ → d`, whitespace collapsed.
 */
export function toSearchKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** URL slug from a Vietnamese title: `Làm chậu từ vỏ sò` → `lam-chau-tu-vo-so`. */
export function toSlug(text: string, maxLength = 80): string {
  return toSearchKey(text)
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, maxLength)
    .replace(/^-+|-+$/g, "");
}
