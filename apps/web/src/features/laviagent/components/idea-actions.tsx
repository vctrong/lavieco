"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { FiArrowLeft, FiMessageCircle, FiPackage } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { LaviAgentMascot } from "@/shared/components/illustrations/laviagent-mascot";

import {
  CONVERSATION_PARAM,
  LAVIAGENT_HREF,
  askAboutIdeaHref,
  conversationHref,
} from "../constants/config";
import { TEXT } from "../constants/text";
import type { Idea, Kit } from "../types";
import { BAR_BUTTON, BAR_PRIMARY, BAR_SECONDARY, BOTTOM_BAR } from "./styles";

const t = TEXT.vi;

type Render = (conversationId: string | null) => ReactNode;

function ConversationParam({ render }: { render: Render }) {
  const id = useSearchParams().get(CONVERSATION_PARAM);
  return render(id && /^[A-Za-z0-9-]{1,100}$/.test(id) ? id : null);
}

/**
 * The idea page is static; the conversation it was opened from (`?hoi-thoai=<id>`) is
 * read on the client. Until then (and when opened directly) the links have no id.
 */
function WithConversation({ render }: { render: Render }) {
  return (
    <Suspense fallback={render(null)}>
      <ConversationParam render={render} />
    </Suspense>
  );
}

/** "Ý tưởng khác": back to the conversation that opened the idea, or to LaviAgent. */
export function IdeaBackLink({ materialName }: { materialName: string | null }) {
  return (
    <WithConversation
      render={(conversationId) => (
        <Link
          href={conversationId ? conversationHref(conversationId) : LAVIAGENT_HREF}
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-deep-blue hover:text-emerald-ink"
        >
          <FiArrowLeft aria-hidden="true" size={16} />
          {conversationId && materialName ? `${t.idea.back} · ${materialName}` : t.idea.backHome}
        </Link>
      )}
    />
  );
}

/**
 * "Hỏi LaviAgent về ý tưởng này" (back to its conversation, or a new one about the
 * idea) and, on phones, the "Xem KIT" bar pinned to the bottom.
 */
export function IdeaActions({ idea, kit }: { idea: Idea; kit: Kit | null }) {
  return (
    <WithConversation
      render={(conversationId) => {
        const askHref = askAboutIdeaHref(idea.id, conversationId);
        return (
          <>
            <Link
              href={askHref}
              className="hidden min-h-12 w-full items-center justify-center gap-2 rounded-full border border-deep-blue/20 bg-soft-white text-sm font-semibold text-deep-blue transition-colors hover:border-emerald-brand hover:bg-mint-mist lg:flex"
            >
              <LaviAgentMascot className="size-6" />
              {t.idea.askAboutIdea}
            </Link>

            <div className={cn(BOTTOM_BAR, "lg:hidden")}>
              <div className="mx-auto flex max-w-md gap-2">
                <Link
                  href={askHref}
                  aria-label={t.idea.askAboutIdea}
                  className={cn(BAR_BUTTON, BAR_SECONDARY, kit ? "w-14 shrink-0 px-0" : "flex-1")}
                >
                  <FiMessageCircle aria-hidden="true" size={18} />
                  {kit ? null : t.idea.askAboutIdea}
                </Link>
                {kit ? (
                  <Link href={kit.productUrl} className={cn(BAR_BUTTON, BAR_PRIMARY, "flex-1")}>
                    <FiPackage aria-hidden="true" size={17} />
                    {t.kit.view} · {t.price(kit.price)}
                  </Link>
                ) : null}
              </div>
            </div>
          </>
        );
      }}
    />
  );
}
