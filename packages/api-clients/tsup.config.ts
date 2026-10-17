import { defineConfig } from "tsup";

// ESM for the Next.js apps, CJS for the NestJS services (ADR-012).
export default defineConfig((options) => ({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  // `npm run dev` runs `tsup --watch` while the services start and load dist/index.cjs:
  // wiping the folder first made them crash at random. Only a real build cleans.
  clean: !options.watch,
  sourcemap: true,
  target: "es2022",
  external: ["@lavieco/shared"],
}));
