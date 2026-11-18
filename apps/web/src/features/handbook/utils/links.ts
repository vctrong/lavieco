/**
 * "Hỏi LaviAgent" from the handbook: only the page key (and an editor's suggested
 * question) travel in the address, never the page text. LaviAgent's server loads the
 * published text itself (ADR-0029, docs/07).
 */
export const AGENT_PAGE_PARAM = "cam-nang";
export const AGENT_PROMPT_PARAM = "goi-y";

export function agentHrefFor(pageKey: string, prompt = ""): string {
  const params = new URLSearchParams({ [AGENT_PAGE_PARAM]: pageKey });
  if (prompt.trim()) params.set(AGENT_PROMPT_PARAM, prompt.trim().slice(0, 200));
  return `/laviagent?${params.toString()}`;
}
