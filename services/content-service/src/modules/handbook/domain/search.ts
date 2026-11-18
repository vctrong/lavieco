import { HANDBOOK_LIMITS } from "@lavieco/shared/content";

/**
 * Search inside the published book (UC-02): accent-insensitive ("vo so" finds "vỏ sò"),
 * every word must appear in the page title or text, results in book order with a
 * snippet and the ranges to highlight. A few hundred pages fit in memory, so this is a
 * plain scan over the cached published version; no index is needed in phase 1.
 */

export type SearchablePage = {
  key: string;
  number: number;
  chapterId: string;
  title: string;
  text: string;
};

export type SearchHit = {
  key: string;
  number: number;
  chapterId: string;
  title: string;
  snippet: string;
  highlights: [number, number][];
};

/** Folds one character the way `toSearchKey` does (lower case, no accent, đ → d). */
function fold(char: string): string {
  return char.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
}

/**
 * Folded text plus, for each folded character, the index of the original character
 * it came from: matches found in the folded text map back onto the original.
 */
export function foldWithMap(text: string): { folded: string; origin: number[] } {
  let folded = "";
  const origin: number[] = [];
  let lastWasSpace = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (/\s/.test(char)) {
      if (!lastWasSpace) {
        folded += " ";
        origin.push(i);
      }
      lastWasSpace = true;
      continue;
    }
    lastWasSpace = false;
    for (const out of fold(char)) {
      folded += out;
      origin.push(i);
    }
  }
  return { folded, origin };
}

export function queryWords(query: string): string[] {
  const { folded } = foldWithMap(query.trim());
  return [...new Set(folded.split(" ").filter((word) => word.length > 0))];
}

/** Original-text ranges `[start, length]` of every occurrence of every word. */
function matchRanges(text: string, words: readonly string[]): [number, number][] {
  const { folded, origin } = foldWithMap(text);
  const ranges: [number, number][] = [];
  for (const word of words) {
    let from = 0;
    for (;;) {
      const at = folded.indexOf(word, from);
      if (at < 0) break;
      const start = origin[at]!;
      const end = origin[at + word.length - 1]! + 1;
      ranges.push([start, end - start]);
      from = at + word.length;
    }
  }
  return ranges.sort((a, b) => a[0] - b[0]);
}

const SNIPPET_BEFORE = 50;
const SNIPPET_LENGTH = 180;

function snippetAround(text: string, ranges: readonly [number, number][]) {
  const flat = text.replace(/\s+/g, " ");
  const first = ranges[0];
  if (!first) {
    const snippet = flat.slice(0, SNIPPET_LENGTH).trim();
    return { snippet: flat.length > SNIPPET_LENGTH ? `${snippet}…` : snippet, highlights: [] };
  }
  let start = Math.max(0, first[0] - SNIPPET_BEFORE);
  // Start on a word boundary so the snippet does not open mid-word.
  if (start > 0) {
    const space = flat.indexOf(" ", start);
    if (space >= 0 && space < first[0]) start = space + 1;
  }
  const end = Math.min(flat.length, start + SNIPPET_LENGTH);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < flat.length ? "…" : "";
  const body = flat.slice(start, end);
  const highlights = ranges
    .filter(([at, length]) => at >= start && at + length <= end)
    .map(([at, length]): [number, number] => [at - start + prefix.length, length]);
  return { snippet: `${prefix}${body}${suffix}`, highlights };
}

export function searchPages(pages: readonly SearchablePage[], query: string): SearchHit[] {
  const words = queryWords(query);
  if (words.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const page of pages) {
    const haystack = foldWithMap(`${page.title} ${page.text}`).folded;
    if (!words.every((word) => haystack.includes(word))) continue;
    const flatText = page.text.replace(/\s+/g, " ");
    const ranges = matchRanges(flatText, words);
    const { snippet, highlights } = snippetAround(flatText, ranges);
    hits.push({
      key: page.key,
      number: page.number,
      chapterId: page.chapterId,
      title: page.title,
      snippet,
      highlights,
    });
    if (hits.length >= HANDBOOK_LIMITS.searchResultsMax) break;
  }
  return hits;
}
