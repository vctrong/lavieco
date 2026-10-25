import { Suspense } from "react";

import { LaviAgentApp, getLaviagentCatalog, laviagentMetadata } from "@/features/laviagent";

export const metadata = laviagentMetadata;

export default function LaviAgentPage() {
  // Suspense: the app reads `?hoi-thoai=` and friends on the client; the page stays static.
  return (
    <Suspense>
      <LaviAgentApp catalog={getLaviagentCatalog()} />
    </Suspense>
  );
}
