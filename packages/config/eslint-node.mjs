import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

import { RESTRICTED_IMPORTS, restrictedSyntax } from "./eslint-base.mjs";

/**
 * ESLint preset for Node code: NestJS services and the packages they use
 * (shared, api-clients, service-kit, observability). docs/04 §10.1.
 *
 * `process.env` is only readable from a `config/` folder (docs/04 §8).
 */
export const nodePreset = defineConfig([
  // tsup writes a temporary bundled config while building, possibly during a parallel lint.
  globalIgnores(["dist/**", "coverage/**", "tsup.config.bundled_*"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-console": "error",
      // No `consistent-type-imports`: NestJS resolves constructor parameters from
      // emitted type metadata, so injected classes must stay value imports.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-restricted-imports": RESTRICTED_IMPORTS,
      "no-restricted-syntax": restrictedSyntax(["processEnv", "tsEnum"]),
    },
  },
  {
    files: ["src/**/config/**/*.ts", "src/**/*.spec.ts", "src/test/**/*.ts"],
    rules: { "no-restricted-syntax": restrictedSyntax(["tsEnum"]) },
  },
  {
    // One-off operator commands write their result to the terminal on purpose.
    files: ["src/cli/**/*.ts"],
    rules: { "no-console": "off" },
  },
  {
    // Service migrations (docs/03 §10.1) are CommonJS scripts outside src/ (L2).
    files: ["migrations/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { exports: "writable", module: "writable", require: "readonly" },
    },
  },
]);

/**
 * S1 (docs/04 §6.3): inside a service only the `infrastructure` layer imports mongoose.
 * Applied by services on top of the preset.
 */
export const serviceLayerRules = defineConfig([
  {
    files: ["src/modules/**/*.ts"],
    ignores: ["src/modules/**/infrastructure/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "mongoose", message: "Only the infrastructure layer imports mongoose. S1" },
            {
              name: "@nestjs/mongoose",
              message: "Only the infrastructure layer imports mongoose. S1",
            },
          ],
          patterns: RESTRICTED_IMPORTS[1].patterns,
        },
      ],
    },
  },
  {
    // application/ depends on ports only; Nest wiring happens in <module>.module.ts.
    files: ["src/modules/**/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@lavieco/service-kit",
              message: "application/ imports @lavieco/service-kit/ports only. docs/04 §6.2",
            },
          ],
          patterns: [
            {
              group: ["@nestjs/*", "mongoose"],
              message: "application/ does not import Nest or Mongoose. docs/04 §6.2",
            },
            ...RESTRICTED_IMPORTS[1].patterns,
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/**/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@nestjs/*", "mongoose", "@lavieco/service-kit"],
              message: "domain/ is pure TypeScript: no framework imports. docs/04 §6.2",
            },
          ],
        },
      ],
    },
  },
]);
