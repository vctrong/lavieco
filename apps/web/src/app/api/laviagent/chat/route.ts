import { handleChat } from "@/features/laviagent";

/** Streaming answers may take a while on the free tier. */
export const maxDuration = 30;

export const POST = handleChat;
