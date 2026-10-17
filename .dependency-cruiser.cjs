// Alias resolution uses tsconfig.depcruise.json (depcruise mis-resolves the app tsconfig `extends`).
// Enforces the import boundaries in docs/04 §4.1 and §5.2 (F1, F2). `npm run deps:check`.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "apps-do-not-import-services",
      comment: "apps and services talk over HTTP, never through code (docs/04 §4.1)",
      severity: "error",
      from: { path: "^(apps|packages)/" },
      to: { path: "^services/" },
    },
    {
      name: "packages-do-not-import-apps",
      comment: "packages/ hold contracts and tooling only (docs/04 §4.1)",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "f2-no-cross-feature-import",
      comment: "F2: a feature never imports another feature. Share via @lavieco/ui or src/shared.",
      severity: "error",
      from: { path: "^apps/([^/]+)/src/features/([^/]+)/" },
      to: {
        path: "^apps/$1/src/features/[^/]+/",
        pathNot: "^apps/$1/src/features/$2/",
      },
    },
    {
      name: "f1-features-only-through-index",
      comment: "F1: code outside a feature imports it through its index.ts only.",
      severity: "error",
      from: { path: "^apps/([^/]+)/src/(app|lib|shared|proxy\.ts)" },
      to: {
        path: "^apps/$1/src/features/[^/]+/",
        pathNot: "^apps/$1/src/features/[^/]+/index\\.ts$",
      },
    },
    {
      name: "shared-does-not-import-features",
      comment: "src/shared and src/lib sit below features",
      severity: "error",
      from: { path: "^apps/[^/]+/src/(shared|lib)/" },
      to: { path: "^apps/[^/]+/src/features/" },
    },
    {
      name: "services-do-not-import-apps",
      comment: "services never import apps (docs/04 §4.1)",
      severity: "error",
      from: { path: "^services/" },
      to: { path: "^apps/" },
    },
    {
      name: "no-service-to-service-import",
      comment:
        "A service calls another one over HTTP (@lavieco/api-clients), never through code (docs/04 §4.1)",
      severity: "error",
      from: { path: "^services/([^/]+)/" },
      to: { path: "^services/", pathNot: "^services/$1/" },
    },
    {
      name: "s2-modules-only-through-index",
      comment: "S2: a module imports another module of the same service through its index.ts only",
      severity: "error",
      from: { path: "^services/([^/]+)/src/modules/([^/]+)/" },
      to: {
        path: "^services/$1/src/modules/[^/]+/",
        pathNot: ["^services/$1/src/modules/$2/", "^services/$1/src/modules/[^/]+/index\.ts$"],
      },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.depcruise.json" },
    exclude: { path: "(^|/)(\\.next|node_modules|dist)/|\\.spec\\.tsx?$" },
  },
};
