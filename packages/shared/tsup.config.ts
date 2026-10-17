import { defineConfig } from "tsup";

// ESM for the Next.js apps, CJS for the NestJS services (ADR-012).
export default defineConfig((options) => ({
  entry: {
    index: "src/index.ts",
    "permissions/index": "src/permissions/index.ts",
    "identity/index": "src/identity/index.ts",
    "events/index": "src/events/index.ts",
    "media/index": "src/media/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  // `npm run dev` runs `tsup --watch` while the services start and load dist/index.cjs:
  // wiping the folder first made them crash at random. Only a real build cleans.
  clean: !options.watch,
  sourcemap: true,
  target: "es2022",
}));
