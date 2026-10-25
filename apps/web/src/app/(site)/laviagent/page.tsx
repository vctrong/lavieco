import { Suspense } from "react";

import { LaviAgentApp, getLaviagentCatalog, laviagentMetadata } from "@/features/laviagent";

export const metadata = laviagentMetadata;

export default function LaviAgentPage() {
  // Suspense: the app reads `?vat-lieu=` on the client; the rest of the page stays static.
  return (
    <Suspense>
      <LaviAgentApp catalog={getLaviagentCatalog()} />
    </Suspense>
  );
}
