type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonLdObject = { [key: string]: JsonValue };

// Built from code points: the raw characters would end a line inside a regex literal.
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), "g");
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), "g");

/**
 * JSON for a `<script type="application/ld+json">`. `<`, `>` and `&` become unicode
 * escapes so no string (an event title, say) can close the script element or open a
 * comment; U+2028/U+2029 are escaped for old parsers. Exported for its test.
 */
export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(LINE_SEPARATOR, "\\u2028")
    .replace(PARAGRAPH_SEPARATOR, "\\u2029");
}

/**
 * Structured data for search engines (schema.org). The ONE place allowed to use
 * `dangerouslySetInnerHTML` (exception approved 22/10/2026, CLAUDE.md §8): it takes an
 * object, never a string, and serialises it with `serializeJsonLd`.
 */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
