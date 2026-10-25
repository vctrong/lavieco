/** The small markdown subset LaviAgent answers in: paragraphs, lists, **bold**. */
export type Inline = { text: string; bold: boolean };
export type Block =
  { type: "paragraph"; lines: Inline[][] } | { type: "list"; ordered: boolean; items: Inline[][] };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

/** `**bold**` only; unmatched asterisks stay as text. Headings lose their `#`. */
export function parseInline(line: string): Inline[] {
  const cleaned = line.replace(/^#{1,6}\s+/, "");
  const parts = cleaned.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .filter((part) => part !== "")
    .map((part) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    );
}

/** Parsed into data and rendered by a component: no HTML string ever reaches the DOM. */
export function parseMiniMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
    const trimmed = line.trim();
    const previous = blocks.at(-1);
    if (!trimmed) {
      // A blank line closes the current block.
      if (previous) blocks.push({ type: "paragraph", lines: [] });
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    const item = bullet?.[1] ?? numbered?.[1];
    if (item !== undefined) {
      const ordered = Boolean(numbered);
      if (previous?.type === "list" && previous.ordered === ordered) {
        previous.items.push(parseInline(item));
      } else {
        blocks.push({ type: "list", ordered, items: [parseInline(item)] });
      }
      continue;
    }
    if (previous?.type === "paragraph") previous.lines.push(parseInline(trimmed));
    else blocks.push({ type: "paragraph", lines: [parseInline(trimmed)] });
  }
  return blocks.filter((block) => block.type === "list" || block.lines.length > 0);
}
