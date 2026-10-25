import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IdeaDetail, getLaviagentCatalog, ideaMetadata } from "@/features/laviagent";

/** Demo ideas are static JSON: every page is prerendered, unknown ids are 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return getLaviagentCatalog().ideas.map((idea) => ({ id: idea.id }));
}

const findIdea = (id: string) => getLaviagentCatalog().ideas.find((idea) => idea.id === id);

export async function generateMetadata({
  params,
}: PageProps<"/laviagent/y-tuong/[id]">): Promise<Metadata> {
  const idea = findIdea((await params).id);
  return idea ? ideaMetadata(idea) : {};
}

export default async function LaviAgentIdeaPage({ params }: PageProps<"/laviagent/y-tuong/[id]">) {
  const idea = findIdea((await params).id);
  if (!idea) notFound();
  return <IdeaDetail idea={idea} catalog={getLaviagentCatalog()} />;
}
