import { Fragment } from "react";

import { parseMiniMarkdown, type Inline } from "../../utils/mini-markdown";

function InlineText({ parts }: { parts: Inline[] }) {
  return parts.map((part, index) =>
    part.bold ? (
      <strong key={index} className="font-semibold text-deep-blue">
        {part.text}
      </strong>
    ) : (
      <Fragment key={index}>{part.text}</Fragment>
    ),
  );
}

/** Renders the model's small markdown as React elements (never as an HTML string). */
export function MarkdownText({ text }: { text: string }) {
  const blocks = parseMiniMarkdown(text);
  return (
    <div className="space-y-2.5">
      {blocks.map((block, index) => {
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List
              key={index}
              className={
                block.ordered
                  ? "list-decimal space-y-1 pl-5 marker:font-semibold marker:text-emerald-ink"
                  : "list-disc space-y-1 pl-5 marker:text-emerald-brand"
              }
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <InlineText parts={item} />
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                <InlineText parts={line} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
