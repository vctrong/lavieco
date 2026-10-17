import { defineConfig } from "tsup";

// Dual output (ADR-012). Nest relies on decorator metadata, which esbuild cannot emit:
// with `emitDecoratorMetadata` in tsconfig, tsup compiles through @swc/core instead.
export default defineConfig((options) => ({
  entry: { index: "src/index.ts", "ports/index": "src/ports/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  // `npm run dev` runs `tsup --watch` while the services start and load dist/index.cjs:
  // wiping the folder first made them crash at random. Only a real build cleans.
  clean: !options.watch,
  sourcemap: true,
  target: "es2022",
  tsconfig: "tsconfig.build.json",
}));
