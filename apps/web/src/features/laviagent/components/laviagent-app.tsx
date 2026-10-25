"use client";

import { useSearchParams } from "next/navigation";

import { Container } from "@lavieco/ui";

import { MATERIAL_QUERY_PARAM } from "../constants/config";
import { useAgentFlow } from "../hooks/use-agent-flow";
import { materialIdSchema } from "../schemas";
import type { Catalog } from "../types";
import { HazardScreen, PickScreen } from "./edge-screens";
import { HomeScreen } from "./home-screen";
import { AnalyzingScreen, ReviewScreen } from "./photo-screens";
import { ResultScreen } from "./result-screen";

// TODO(laviagent-history): personal history and impact (designed in Stitch) need a
// member account and consent; not part of the demo.

/**
 * `/laviagent`: one page, one screen at a time (home → review → analyzing → result,
 * plus the picker and hazard states). `?vat-lieu=<material>` opens the results of a
 * material directly (the way back from an idea page).
 */
export function LaviAgentApp({ catalog }: { catalog: Catalog }) {
  const params = useSearchParams();
  const initial = materialIdSchema.safeParse(params.get(MATERIAL_QUERY_PARAM));
  const agent = useAgentFlow(catalog, initial.success ? initial.data : null);
  const { flow } = agent;

  let screen;
  switch (flow.step) {
    case "home":
      screen = (
        <HomeScreen
          materials={catalog.materials}
          notice={flow.notice}
          onFile={(file) => void agent.selectFile(file)}
          onDismissNotice={agent.dismissNotice}
          onPickMaterial={(material) => agent.pickMaterial(material)}
          onPickSample={agent.pickSample}
        />
      );
      break;
    case "review":
      screen = (
        <ReviewScreen
          image={flow.image}
          onRetake={agent.reset}
          onAnalyze={() => void agent.analyze(flow.image)}
        />
      );
      break;
    case "analyzing":
      screen = <AnalyzingScreen image={flow.image} onCancel={agent.cancelAnalyze} />;
      break;
    case "pick":
      screen = (
        <PickScreen
          reason={flow.reason}
          image={flow.image}
          materials={catalog.materials}
          onPick={(material) => agent.pickMaterial(material, flow.image)}
          onPickSample={agent.pickSample}
          onBack={agent.reset}
        />
      );
      break;
    case "hazard":
      screen = <HazardScreen image={flow.image} result={flow.result} onReset={agent.reset} />;
      break;
    case "result": {
      const material = catalog.materials.find((item) => item.id === flow.material);
      screen = material ? (
        <ResultScreen
          // A new material starts a new conversation and filter.
          key={`${flow.material}-${flow.source}`}
          catalog={catalog}
          material={material}
          image={flow.image}
          result={flow.result}
          source={flow.source}
          onCorrect={() => agent.correct(flow.image)}
          onReset={agent.reset}
        />
      ) : null;
      break;
    }
  }

  return (
    <div className="min-h-dvh bg-soft-white pb-16 pt-28 lg:pt-32">
      <Container>{screen}</Container>
    </div>
  );
}
