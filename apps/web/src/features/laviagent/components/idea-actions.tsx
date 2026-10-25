"use client";

import Link from "next/link";
import { useState } from "react";
import { FiMessageCircle, FiPackage } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { LaviAgentMascot } from "@/shared/components/illustrations/laviagent-mascot";

import { TEXT } from "../constants/text";
import { useAgentChat } from "../hooks/use-agent-chat";
import type { Catalog, Idea, Kit } from "../types";
import { ChatSheet } from "./chat/chat-sheet";
import { BAR_BUTTON, BAR_PRIMARY, BAR_SECONDARY, BOTTOM_BAR } from "./styles";

const t = TEXT.vi;

/**
 * Idea page actions: "Hỏi LaviAgent" (a sheet on phones, a side panel on desktop) and,
 * on phones, the "Xem KIT" bar pinned to the bottom.
 */
export function IdeaActions({
  catalog,
  idea,
  kit,
  materialName,
}: {
  catalog: Catalog;
  idea: Idea;
  kit: Kit | null;
  materialName: string;
}) {
  const [open, setOpen] = useState(false);
  const { chat, ask } = useAgentChat({ material: idea.material, ideaId: idea.id });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="hidden min-h-12 w-full items-center justify-center gap-2 rounded-full border border-deep-blue/20 bg-soft-white text-sm font-semibold text-deep-blue transition-colors hover:border-emerald-brand hover:bg-mint-mist lg:flex"
      >
        <LaviAgentMascot className="size-6" />
        {t.idea.askAboutIdea}
      </button>

      <div className={cn(BOTTOM_BAR, "lg:hidden")}>
        <div className="mx-auto flex max-w-md gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-label={t.idea.askAboutIdea}
            className={cn(BAR_BUTTON, BAR_SECONDARY, kit ? "w-14 shrink-0 px-0" : "flex-1")}
          >
            <FiMessageCircle aria-hidden="true" size={18} />
            {kit ? null : t.chat.open}
          </button>
          {kit ? (
            <Link href={kit.productUrl} className={cn(BAR_BUTTON, BAR_PRIMARY, "flex-1")}>
              <FiPackage aria-hidden="true" size={17} />
              {t.kit.view} · {t.price(kit.price)}
            </Link>
          ) : null}
        </div>
      </div>

      <ChatSheet
        open={open}
        onClose={() => setOpen(false)}
        chat={chat}
        ask={ask}
        catalog={catalog}
        materialName={materialName}
      />
    </>
  );
}
