import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

import {
  ALL_SELECTOR_NAMES,
  RESTRICTED_IMPORTS,
  restrictedImports,
  restrictedSyntax,
} from "./eslint-base.mjs";

const without = (...excluded) => ALL_SELECTOR_NAMES.filter((name) => !excluded.includes(name));

/** ESLint preset for Next.js apps (apps/web, apps/admin). */
export const nextPreset = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-console": "error",
      "react/no-danger": "error",
      "no-restricted-imports": RESTRICTED_IMPORTS,
      "no-restricted-syntax": restrictedSyntax(ALL_SELECTOR_NAMES),
    },
  },
  {
    // Brand logos (Facebook, Zalo...) have no Feather equivalent: docs/adr/0013.
    files: ["src/features/team/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": restrictedImports({ brandIcons: true }) },
  },
  {
    // Decorative graphics are not icons (docs/04 §5.4): inline <svg> is allowed here only.
    files: ["**/illustrations/**/*.tsx"],
    rules: { "no-restricted-syntax": restrictedSyntax(without("inlineSvg")) },
  },
  {
    // The only places allowed to read process.env.
    files: ["src/lib/env.ts", "src/lib/env.public.ts"],
    rules: { "no-restricted-syntax": restrictedSyntax(without("processEnv")) },
  },
]);
