/**
 * Runs once when the server starts (Next.js instrumentation hook): LaviAgent start-up
 * notes (model in use, pitch mode). `NEXT_RUNTIME` is compared literally so the bundler
 * removes the Node-only import from the Edge build.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logLaviagentStartup } = await import("@/features/laviagent");
    logLaviagentStartup();
  }
}
