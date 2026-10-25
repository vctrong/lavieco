import Image from "next/image";
import type { ReactNode } from "react";
import { FiUser } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { LaviAgentMascot } from "@/shared/components/illustrations/laviagent-mascot";

import { TEXT } from "../../constants/text";
import { textOf } from "../../hooks/use-conversation";
import type { AgentMessage, Catalog } from "../../types";
import { parseCardTokens, type KnownIds } from "../../utils/parse-card-tokens";
import { AnalysisCard, HazardCard, PickerCard, type CardActions } from "../cards";
import { IdeaChip } from "../idea-card";
import { KitChip } from "../kit-card";
import { MarkdownText } from "./markdown-text";
import { TypingDots } from "./typing-dots";

const t = TEXT.vi.chat;

type MessageBubbleProps = {
  message: AgentMessage;
  catalog: Catalog;
  known: KnownIds;
  /** The answer still arriving: hide half-written card tokens. */
  streaming: boolean;
  actions: CardActions;
};

export function MessageBubble({ message, catalog, known, streaming, actions }: MessageBubbleProps) {
  if (message.role === "user") {
    const text = textOf(message);
    return (
      <li className="flex justify-end gap-2.5">
        <div className="flex min-w-0 max-w-[85%] flex-col items-end gap-1.5">
          <span className="sr-only">{t.you}</span>
          {message.parts.map((part, index) =>
            part.type === "file" && part.mediaType.startsWith("image/") ? (
              <Image
                key={index}
                src={part.url}
                alt={t.sentImageAlt}
                width={112}
                height={112}
                // History thumbnails are data URLs; samples are static files.
                unoptimized={part.url.startsWith("data:")}
                className="size-28 rounded-2xl border border-hairline object-cover"
              />
            ) : null,
          )}
          {text && text !== t.photoMarker ? (
            <p className="whitespace-pre-wrap break-words rounded-3xl rounded-br-md bg-deep-blue px-4 py-2.5 text-sm leading-relaxed text-soft-white">
              {text}
            </p>
          ) : null}
        </div>
        <span
          aria-hidden="true"
          className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-mint-mist text-deep-blue"
        >
          <FiUser size={14} />
        </span>
      </li>
    );
  }

  // Cards posted by LaviAgent itself (no model): full width, no bubble.
  const cards = message.parts.flatMap((part, index) => {
    if (part.type === "data-analysis") {
      return [<AnalysisCard key={index} data={part.data} catalog={catalog} actions={actions} />];
    }
    if (part.type === "data-hazard") return [<HazardCard key={index} data={part.data} />];
    if (part.type === "data-picker") {
      return [
        <PickerCard key={index} reason={part.data.reason} catalog={catalog} actions={actions} />,
      ];
    }
    return [];
  });
  if (cards.length > 0) {
    return (
      <li className="flex gap-2.5">
        <LaviAgentMascot className="mt-1 hidden size-7 sm:block" />
        <div className="min-w-0 flex-1">
          <span className="sr-only">{t.agent}</span>
          {cards}
        </div>
      </li>
    );
  }

  const text = textOf(message);
  // An answer that ended empty is removed by the conversation; never show a frozen bubble.
  if (!text && !streaming) return null;
  return (
    <AgentBubble fallback={Boolean(message.metadata?.fallback)}>
      {text ? (
        parseCardTokens(text, known, streaming).map((segment, index) => {
          if (segment.type === "text") return <MarkdownText key={index} text={segment.text} />;
          if (segment.type === "idea") {
            const idea = catalog.ideas.find((item) => item.id === segment.id);
            return idea ? (
              <IdeaChip key={index} idea={idea} conversationId={actions.conversationId} />
            ) : null;
          }
          const kit = catalog.kits.find((item) => item.id === segment.id);
          return kit ? <KitChip key={index} kit={kit} /> : null;
        })
      ) : (
        <TypingDots />
      )}
    </AgentBubble>
  );
}

/** Assistant row: mascot avatar and a soft bubble. */
export function AgentBubble({
  children,
  fallback = false,
  className,
}: {
  children: ReactNode;
  fallback?: boolean;
  className?: string;
}) {
  return (
    <li className="flex gap-2.5">
      <LaviAgentMascot className="mt-1 size-7" />
      <div className="min-w-0 max-w-[88%]">
        <span className="sr-only">{t.agent}</span>
        <div
          className={cn(
            "space-y-2.5 break-words rounded-3xl rounded-tl-md border border-hairline bg-soft-white px-4 py-3 text-sm leading-relaxed text-charcoal shadow-ambient",
            className,
          )}
        >
          {children}
        </div>
        {fallback ? (
          <span className="mt-1 block pl-2 text-[11px] text-charcoal/50">{t.fallbackNote}</span>
        ) : null}
      </div>
    </li>
  );
}
