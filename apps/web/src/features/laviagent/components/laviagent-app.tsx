"use client";

import { generateId } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiClock, FiPlus } from "react-icons/fi";

import {
  CONVERSATION_PARAM,
  IDEA_PARAM,
  LAVIAGENT_HREF,
  MATERIAL_PARAM,
  conversationHref,
} from "../constants/config";
import { TEXT } from "../constants/text";
import { currentMaterial, textMessage } from "../hooks/use-conversation";
import { materialIdSchema } from "../schemas";
import type { AgentMessage, Catalog } from "../types";
import type { ChatHistoryStore, ConversationSummary } from "../utils/chat-history-store";
import { conversationTitle } from "../utils/conversation-title";
import { LocalChatHistoryStore } from "../utils/local-chat-history-store";
import { ConversationView } from "./chat/conversation-view";
import { HistoryDrawer, HistorySidebar } from "./history";

const t = TEXT.vi;

type ActiveConversation = {
  id: string;
  createdAt: string;
  ideaId: string | null;
  initialMessages: AgentMessage[];
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : generateId();

const fresh = (initialMessages: AgentMessage[] = [], ideaId: string | null = null) => ({
  id: newId(),
  createdAt: new Date().toISOString(),
  ideaId,
  initialMessages,
});

/**
 * Which conversation the URL asks for: `?hoi-thoai=<id>` (history, or back from an idea),
 * `?y-tuong=<id>` (a new one about an idea), `?vat-lieu=<material>` (a new one with that
 * material's card), otherwise a new empty one.
 */
async function resolveConversation(
  store: ChatHistoryStore,
  catalog: Catalog,
  params: { conversation: string | null; idea: string | null; material: string | null },
): Promise<ActiveConversation> {
  if (params.conversation) {
    const stored = await store.get(params.conversation);
    if (stored) {
      return {
        id: stored.id,
        createdAt: stored.createdAt,
        ideaId: stored.ideaId,
        initialMessages: stored.messages,
      };
    }
  }
  const idea = catalog.ideas.find((item) => item.id === params.idea);
  if (idea) {
    return fresh([textMessage("assistant", t.chat.ideaSeed(idea.title, idea.id))], idea.id);
  }
  const parsed = materialIdSchema.safeParse(params.material);
  const material = parsed.success
    ? catalog.materials.find((item) => item.id === parsed.data)
    : undefined;
  if (material) {
    return fresh([
      textMessage("user", t.chat.iHave(material.name)),
      {
        id: generateId(),
        role: "assistant",
        parts: [
          {
            type: "data-analysis",
            data: { material: material.id, source: "manual", result: null },
          },
        ],
      },
    ]);
  }
  return fresh();
}

/**
 * `/laviagent`, chat first (docs/07 §4): history on the left (a drawer on phones), the
 * conversation in the middle, the composer pinned at the bottom. The frame follows the
 * visual viewport, so the on-screen keyboard never covers the composer.
 */
export function LaviAgentApp({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const params = useSearchParams();
  const [store] = useState<ChatHistoryStore>(() => new LocalChatHistoryStore());
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [active, setActive] = useState<ActiveConversation | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const requested = params.get(CONVERSATION_PARAM);
  const ideaParam = params.get(IDEA_PARAM);
  const materialParam = params.get(MATERIAL_PARAM);

  const refresh = useCallback(() => {
    void store.list().then(setConversations);
  }, [store]);

  useEffect(refresh, [refresh]);

  useEffect(() => {
    let alive = true;
    void resolveConversation(store, catalog, {
      conversation: requested,
      idea: ideaParam,
      material: materialParam,
    }).then((next) => {
      // The same conversation coming back through the URL must not remount the thread.
      if (alive) setActive((current) => (current?.id === next.id ? current : next));
    });
    return () => {
      alive = false;
    };
  }, [store, catalog, requested, ideaParam, materialParam]);

  // iOS keeps the layout viewport under the keyboard: follow the visual one instead.
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = rootRef.current;
    if (!viewport || !root) return;
    const sync = () => {
      root.style.setProperty("--vvh", `${viewport.height}px`);
      root.style.setProperty("--vvt", `${viewport.offsetTop}px`);
    };
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, []);

  const persist = useCallback(
    (messages: AgentMessage[]) => {
      if (!active) return;
      void store
        .save({
          id: active.id,
          title: conversationTitle(messages, catalog.materials) ?? t.history.untitled,
          createdAt: active.createdAt,
          updatedAt: new Date().toISOString(),
          material: currentMaterial(messages),
          ideaId: active.ideaId,
          messages,
        })
        .then(() => {
          refresh();
          // The URL now names the conversation: reload, share-free, back from an idea.
          if (requested !== active.id) {
            router.replace(conversationHref(active.id), { scroll: false });
          }
        });
    },
    [active, catalog.materials, refresh, requested, router, store],
  );

  const startNew = () => {
    setActive(fresh());
    router.push(LAVIAGENT_HREF, { scroll: false });
  };

  const open = (id: string) => router.push(conversationHref(id), { scroll: false });

  const remove = (id: string) => {
    void store.remove(id).then(() => {
      refresh();
      if (id === active?.id) startNew();
    });
  };

  const title = conversations.find((item) => item.id === active?.id)?.title ?? t.history.untitled;
  const list = {
    catalog,
    conversations,
    activeId: active?.id ?? null,
    onOpen: open,
    onRemove: remove,
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-x-0 top-[var(--vvt,0px)] flex h-[var(--vvh,100dvh)] flex-col bg-soft-white pt-16 lg:pt-[4.75rem]"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 gap-4 sm:px-3 sm:pb-3 lg:px-4 lg:pb-4">
        <HistorySidebar
          {...list}
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
          onNew={startNew}
        />

        <section
          aria-label={t.chat.title}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t border-hairline bg-soft-white sm:rounded-[2rem] sm:border"
        >
          <header className="flex items-center gap-1 border-b border-hairline px-2 py-1">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t.history.open}
              aria-haspopup="dialog"
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-deep-blue hover:bg-mint-mist lg:hidden"
            >
              <FiClock aria-hidden="true" size={18} />
            </button>
            <h1 className="min-w-0 flex-1 truncate px-2 text-sm font-semibold text-deep-blue">
              {title}
            </h1>
            <button
              type="button"
              onClick={startNew}
              aria-label={t.history.newChat}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-deep-blue hover:bg-mint-mist lg:hidden"
            >
              <FiPlus aria-hidden="true" size={19} />
            </button>
          </header>

          {active ? (
            <ConversationView
              key={active.id}
              catalog={catalog}
              conversationId={active.id}
              initialMessages={active.initialMessages}
              ideaId={active.ideaId}
              onPersist={persist}
            />
          ) : (
            <div className="flex-1" />
          )}
        </section>
      </div>

      <HistoryDrawer
        {...list}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNew={startNew}
      />
    </div>
  );
}
