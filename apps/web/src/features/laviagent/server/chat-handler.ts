import "server-only";

import { createUIMessageStreamResponse } from "ai";
import { z } from "zod";

import {
  CHAT_HISTORY_LIMIT,
  CHAT_IP_LIMIT,
  CHAT_IP_WINDOW_MS,
  CHAT_MESSAGE_MAX_CHARS,
  CHAT_SESSION_LIMIT,
  CHAT_SESSION_WINDOW_MS,
  CHAT_TIMEOUT_MS,
  MAX_UPLOAD_BYTES,
} from "../constants/config";
import { chatContextSchema } from "../schemas";
import { sniffImageType } from "../utils/sniff-image";
import type { ChatTurn, ImageInput } from "./ai/ai-provider";
import { aiProvider } from "./ai/get-provider";
import { knowledgeSource } from "./knowledge/composite-knowledge-source";
import type { ChatKnowledge } from "./knowledge/knowledge-source";
import { logWarn } from "./log";
import { buildChatInstructions } from "./prompts/build-chat-prompt";
import { clientIpOf, consume, isSameOrigin, readSession } from "./rate-limit";

/** A base64 data URL is ~4/3 of the image, plus the JSON around it. */
const MAX_BODY_BYTES = Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 256 * 1024;
/** Older assistant answers are trimmed; they only give the model the thread. */
const ASSISTANT_TURN_MAX_CHARS = 2_000;

const partSchema = z.looseObject({ type: z.string() });
const messageSchema = z.object({
  id: z.string().max(100),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(partSchema).max(20),
});
const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(200),
  context: chatContextSchema.optional(),
});

type ChatFailure = "invalid_request" | "too_long" | "invalid_image" | "rate_limited";

const STATUS: Record<ChatFailure, number> = {
  invalid_request: 400,
  too_long: 400,
  invalid_image: 400,
  rate_limited: 429,
};

/** useChat surfaces the body as the error message; the client maps `reason` to copy. */
function fail(reason: ChatFailure, setCookie: string | null = null): Response {
  const headers = new Headers({ "cache-control": "no-store" });
  if (setCookie) headers.set("set-cookie", setCookie);
  return Response.json({ status: "error", reason }, { status: STATUS[reason], headers });
}

const textOf = (parts: z.infer<typeof partSchema>[]) =>
  parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => String(part.text))
    .join("\n")
    .trim();

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

/** The first image of a message, verified by its bytes; undefined when there is none. */
function imageOf(parts: z.infer<typeof partSchema>[]): ImageInput | undefined | "invalid" {
  const file = parts.find((part) => part.type === "file");
  if (!file) return undefined;
  const match = typeof file.url === "string" ? DATA_URL.exec(file.url) : null;
  if (!match?.[2]) return "invalid";
  const bytes = new Uint8Array(Buffer.from(match[2], "base64"));
  if (bytes.byteLength > MAX_UPLOAD_BYTES) return "invalid";
  const mediaType = sniffImageType(bytes);
  return mediaType ? { mediaType, bytes } : "invalid";
}

/**
 * `POST /api/laviagent/chat`: the useChat protocol in, a UI message stream out. Only
 * the last CHAT_HISTORY_LIMIT messages are used and only the newest image is kept.
 */
export async function handleChat(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail("invalid_request");
  const session = readSession(request);
  if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) {
    return fail("invalid_image", session.setCookie);
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return fail("invalid_request", session.setCookie);
    body = parsed.data;
  } catch {
    return fail("invalid_request", session.setCookie);
  }

  const recent = body.messages
    .filter((message) => message.role !== "system")
    .slice(-CHAT_HISTORY_LIMIT);
  const last = recent.at(-1);
  if (!last || last.role !== "user") return fail("invalid_request", session.setCookie);

  const lastText = textOf(last.parts);
  if (lastText.length > CHAT_MESSAGE_MAX_CHARS) return fail("too_long", session.setCookie);
  const lastImage = imageOf(last.parts);
  if (lastImage === "invalid") return fail("invalid_image", session.setCookie);
  if (!lastText && !lastImage) return fail("invalid_request", session.setCookie);

  const ip = clientIpOf(request);
  if (
    !consume(`chat:s:${session.id}`, CHAT_SESSION_LIMIT, CHAT_SESSION_WINDOW_MS) ||
    !consume(`chat:ip:${ip}`, CHAT_IP_LIMIT, CHAT_IP_WINDOW_MS)
  ) {
    return fail("rate_limited", session.setCookie);
  }

  const turns: ChatTurn[] = recent.map((message, index) => {
    const isLast = index === recent.length - 1;
    const text = textOf(message.parts);
    if (message.role === "assistant") {
      return { role: "assistant", text: text.slice(0, ASSISTANT_TURN_MAX_CHARS) };
    }
    if (isLast) return { role: "user", text: lastText, ...(lastImage ? { image: lastImage } : {}) };
    // Older photos are not resent: the model only needs to know there was one.
    const hadImage = message.parts.some((part) => part.type === "file");
    return {
      role: "user",
      text: `${text.slice(0, CHAT_MESSAGE_MAX_CHARS)}${hadImage ? " [đã gửi kèm một ảnh]" : ""}`.trim(),
    };
  });

  const knowledge = await gatherKnowledge(lastText, body.context ?? {});
  const provider = aiProvider();
  try {
    const stream = provider.chatStream(
      { instructions: buildChatInstructions(knowledge), turns, knowledge },
      { signal: AbortSignal.any([AbortSignal.timeout(CHAT_TIMEOUT_MS), request.signal]) },
    );
    const headers = new Headers({ "cache-control": "no-store" });
    if (session.setCookie) headers.set("set-cookie", session.setCookie);
    return createUIMessageStreamResponse({ stream, headers });
  } catch (error) {
    logWarn("laviagent chat failed", {
      provider: provider.id,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return Response.json({ status: "error", reason: "unavailable" }, { status: 503 });
  }
}

async function gatherKnowledge(
  question: string,
  context: z.infer<typeof chatContextSchema>,
): Promise<ChatKnowledge> {
  const source = knowledgeSource();
  const focusIdea = context.ideaId ? await source.getIdea(context.ideaId) : null;
  const material = context.material ?? focusIdea?.material;
  const [ideas, kits, passages] = await Promise.all([
    material ? source.getIdeasByMaterial(material) : Promise.resolve([]),
    source.getKits(),
    source.searchContext(question, material),
  ]);
  return { material, focusIdea, ideas, kits, passages };
}
