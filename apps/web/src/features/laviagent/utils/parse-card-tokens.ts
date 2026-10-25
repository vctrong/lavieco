export type CardSegment =
  { type: "text"; text: string } | { type: "idea"; id: string } | { type: "kit"; id: string };

export type KnownIds = { ideas: ReadonlySet<string>; kits: ReadonlySet<string> };

const TOKEN = /\[\[(idea|kit):([a-z0-9-]{1,60})\]\]/g;
/** A token still being streamed: "[[", "[[ide", "[[kit:abc"... at the very end. */
const PARTIAL_TOKEN = /\[\[?(?:[a-z]{0,4}(?::[a-z0-9-]{0,60})?)?\]?$/;

/**
 * Splits an assistant answer into text and card segments (`[[idea:<id>]]`,
 * `[[kit:<id>]]`, see prompts/system-prompt.ts). Ids not in `known` are dropped: the
 * model must never make a card appear for something that does not exist. The same
 * card is shown once per answer.
 */
export function parseCardTokens(input: string, known: KnownIds, streaming = false): CardSegment[] {
  const text = streaming ? input.replace(PARTIAL_TOKEN, "") : input;
  const segments: CardSegment[] = [];
  const shown = new Set<string>();
  let cursor = 0;

  const pushText = (value: string) => {
    if (!value) return;
    const previous = segments.at(-1);
    if (previous?.type === "text") previous.text += value;
    else segments.push({ type: "text", text: value });
  };

  for (const match of text.matchAll(TOKEN)) {
    const [whole, kind, id] = match;
    pushText(text.slice(cursor, match.index));
    cursor = match.index + whole.length;
    if (!id || (kind !== "idea" && kind !== "kit")) continue;
    const exists = kind === "idea" ? known.ideas.has(id) : known.kits.has(id);
    const key = `${kind}:${id}`;
    if (exists && !shown.has(key)) {
      shown.add(key);
      segments.push({ type: kind, id });
    }
  }
  pushText(text.slice(cursor));

  return segments
    .map((segment) =>
      segment.type === "text"
        ? { ...segment, text: segment.text.replace(/\n{3,}/g, "\n\n") }
        : segment,
    )
    .filter((segment) => segment.type !== "text" || segment.text.trim() !== "");
}
