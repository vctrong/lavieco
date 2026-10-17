import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// Integration tests against a real MongoDB replica set started by Testcontainers
// (docs/04 §9, PQ4 default). Needs Docker.
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    include: ["src/test/integration/**/*.int-spec.ts"],
    globalSetup: ["src/test/support/global-setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
