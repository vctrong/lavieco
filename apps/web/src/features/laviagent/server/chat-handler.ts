import "server-only";

import { createUIMessageStreamResponse, type UIMessageChunk } from "ai";
import { z } from "zod";

import {
  CHAT_HISTORY_LIMIT,
  CHAT_IP_LIMIT,
  CHAT_IP_WINDOW_MS,
  CHAT_MESSAGE_MAX_CHARS,
  CHAT_SESSION_LIMIT,
  CHAT_SESSION_WINDOW_MS,
  CHAT_FIRST_CHUNK_TIMEOUT_MS,
  CHAT_TIMEOUT_MS,
  MAX_UPLOAD_BYTES,
} from "../constants/config";
import { chatContextSchema, classifyResultSchema, materialIdSchema } from "../schemas";
import { inferMaterial } from "../utils/infer-material";
import { sniffImageType } from "../utils/sniff-image";
import type { ChatTurn, ImageInput } from "./ai/ai-provider";
import { aiProvider } from "./ai/get-provider";
import { staticData } from "./knowledge/catalog";
import { knowledgeSource } from "./knowledge/composite-knowledge-source";
import type { ChatKnowledge } from "./knowledge/knowledge-source";
import { logOutcome, logProviderError } from "./log";
import { TIMEOUT_REASONS, classifyStreamEnd, type StreamOutcome } from "./stream-outcome";
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

const analysisPartSchema = z.object({
  type: z.literal("data-analysis"),
  data: z.object({ material: materialIdSchema, result: classifyResultSchema.nullable() }),
});
const hazardPartSchema = z.object({
  type: z.literal("data-hazard"),
  data: z.object({ result: classifyResultSchema }),
});

/**
 * Cards LaviAgent posted without the model (analysis, hazard) become one line the model
 * can read, so a follow-up question keeps the material without asking again.
 */
function summaryOf(part: z.infer<typeof partSchema>): string | null {
  const analysis = analysisPartSchema.safeParse(part);
  if (analysis.success) {
    const { material, result } = analysis.data.data;
    const name = staticData().materials.find((item) => item.id === material)?.name ?? material;
    const details = result ? ` (${result.shape}; ${result.condition})` : "";
    return `[LaviAgent đã nhận diện chất liệu: ${name}${details} và gợi ý các ý tưởng tương ứng.]`;
  }
  const hazard = hazardPartSchema.safeParse(part);
  if (hazard.success) {
    const kind = hazard.data.data.result.safetyFlags.hazardKind;
    return `[LaviAgent đã nhận diện đồ nguy hại (${kind}) và từ chối hướng dẫn tái chế.]`;
  }
  return null;
}

const textOf = (parts: z.infer<typeof partSchema>[]) =>
  parts
    .map((part) =>
      part.type === "text" && typeof part.text === "string" ? String(part.text) : summaryOf(part),
    )
    .filter((value): value is string => Boolean(value))
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

  const turns = mergeTurns(
    recent.map((message, index): ChatTurn => {
      const isLast = index === recent.length - 1;
      const text = textOf(message.parts);
      if (message.role === "assistant") {
        return { role: "assistant", text: text.slice(0, ASSISTANT_TURN_MAX_CHARS) };
      }
      if (isLast)
        return { role: "user", text: lastText, ...(lastImage ? { image: lastImage } : {}) };
      // Older photos are not resent: the model only needs to know there was one.
      const hadImage = message.parts.some((part) => part.type === "file");
      return {
        role: "user",
        text: `${text.slice(0, CHAT_MESSAGE_MAX_CHARS)}${hadImage ? " [đã gửi kèm một ảnh]" : ""}`.trim(),
      };
    }),
  );

  // No material from the page: infer it from what the visitor wrote, newest first.
  const context = body.context ?? {};
  const material =
    context.material ??
    recent
      .filter((message) => message.role === "user")
      .reverse()
      .map((message) => inferMaterial(textOf(message.parts), staticData().materials))
      .find((found) => found !== null) ??
    undefined;
  const knowledge = await gatherKnowledge(lastText, { ...context, material });
  const provider = aiProvider();
  const timeouts = new AbortController();
  const startedAt = Date.now();
  // Two clocks: no first word within 15 s means the model is stuck; 30 s caps the answer.
  const firstChunkTimer = setTimeout(
    () => timeouts.abort(TIMEOUT_REASONS.firstChunk),
    CHAT_FIRST_CHUNK_TIMEOUT_MS,
  );
  const totalTimer = setTimeout(() => timeouts.abort(TIMEOUT_REASONS.total), CHAT_TIMEOUT_MS);
  const clearTimers = () => {
    clearTimeout(firstChunkTimer);
    clearTimeout(totalTimer);
  };
  try {
    const stream = provider.chatStream(
      { instructions: buildChatInstructions(knowledge), turns, knowledge },
      { signal: AbortSignal.any([timeouts.signal, request.signal]) },
    );
    const headers = new Headers({ "cache-control": "no-store" });
    if (session.setCookie) headers.set("set-cookie", session.setCookie);
    return createUIMessageStreamResponse({
      stream: monitorStream(stream, {
        onFirstText: () => clearTimeout(firstChunkTimer),
        timeoutReason: () => (timeouts.signal.aborted ? String(timeouts.signal.reason) : null),
        clientAborted: () => request.signal.aborted,
        onEnd: (outcome, firstChunkMs) => {
          clearTimers();
          logOutcome("chat", {
            provider: provider.id,
            model: provider.model,
            outcome,
            firstChunkMs,
            totalMs: Date.now() - startedAt,
          });
        },
        startedAt,
      }),
      headers,
    });
  } catch (error) {
    clearTimers();
    logProviderError("chat", provider, error);
    return Response.json({ status: "error", reason: "unavailable" }, { status: 503 });
  }
}

/** What the browser gets when the server gives up waiting: a readable `error` chunk. */
const TIMEOUT_ERROR_TEXT = JSON.stringify({ status: "error", reason: "timeout" });

/**
 * Watches the UI message stream without changing the answer: notes the first text,
 * errors and aborts, and reports how it ended. A server timeout turns the `abort` chunk
 * into an `error` chunk, so the browser shows a message instead of a silent stop.
 */
function monitorStream(
  stream: ReadableStream<UIMessageChunk>,
  hooks: {
    onFirstText: () => void;
    timeoutReason: () => string | null;
    clientAborted: () => boolean;
    onEnd: (outcome: StreamOutcome, firstChunkMs: number | undefined) => void;
    startedAt: number;
  },
): ReadableStream<UIMessageChunk> {
  let firstChunkMs: number | undefined;
  let sawError = false;
  let aborted = false;
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    hooks.onEnd(
      classifyStreamEnd({
        sawText: firstChunkMs !== undefined,
        sawError,
        aborted,
        timeoutReason: hooks.timeoutReason(),
        clientAborted: hooks.clientAborted(),
      }),
      firstChunkMs,
    );
  };
  return stream.pipeThrough(
    new TransformStream<UIMessageChunk, UIMessageChunk>({
      transform(chunk, controller) {
        if (chunk.type === "text-delta" && firstChunkMs === undefined) {
          firstChunkMs = Date.now() - hooks.startedAt;
          hooks.onFirstText();
        }
        if (chunk.type === "error") sawError = true;
        if (chunk.type === "abort") {
          aborted = true;
          if (hooks.timeoutReason() && !hooks.clientAborted()) {
            controller.enqueue({ type: "error", errorText: TIMEOUT_ERROR_TEXT });
            return;
          }
        }
        controller.enqueue(chunk);
      },
      flush: end,
    }),
  );
}

/**
 * Cards posted without the model make consecutive turns of one role (photo, card,
 * question...). Merged, so every provider gets a clean user / assistant alternation.
 */
function mergeTurns(turns: ChatTurn[]): ChatTurn[] {
  const merged: ChatTurn[] = [];
  for (const turn of turns) {
    if (!turn.text && !turn.image) continue;
    // Models expect the user to speak first; an opening card is already in the context.
    if (merged.length === 0 && turn.role === "assistant") continue;
    const previous = merged.at(-1);
    if (previous && previous.role === turn.role) {
      previous.text = [previous.text, turn.text].filter(Boolean).join("\n");
      if (turn.image) previous.image = turn.image;
    } else {
      merged.push({ ...turn });
    }
  }
  return merged;
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
