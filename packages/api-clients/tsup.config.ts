import { defineConfig } from "tsup";

// ESM for the Next.js apps, CJS for the NestJS services (ADR-012).
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  external: ["@lavieco/shared"],
});
