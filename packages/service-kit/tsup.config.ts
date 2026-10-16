import { defineConfig } from "tsup";

// Dual output (ADR-012). Nest relies on decorator metadata, which esbuild cannot emit:
// with `emitDecoratorMetadata` in tsconfig, tsup compiles through @swc/core instead.
export default defineConfig({
  entry: { index: "src/index.ts", "ports/index": "src/ports/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  tsconfig: "tsconfig.build.json",
});
