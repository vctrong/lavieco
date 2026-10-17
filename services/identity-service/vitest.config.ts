import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// Unit tests: domain and application, no database. esbuild cannot emit the decorator
// metadata Nest needs, hence swc.
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: { include: ["src/**/*.spec.ts"], exclude: ["src/test/**"] },
});
